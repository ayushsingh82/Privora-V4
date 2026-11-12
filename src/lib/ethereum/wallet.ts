// Wallet connection + transaction SUBMISSION. Entirely separate from the read path: signing and sending go through
// the wallet's own provider (window.ethereum) and are NOT routed through Anon-RPC.
import { createWalletClient, custom, type Address } from "viem";
import { CHAIN, VIEM_CHAIN } from "./chains";
import { rotateIsolationKey, clearIsolationKey } from "./read-client";

interface Eip1193 {
  request(a: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(ev: string, cb: (...args: never[]) => void): void;
}
export interface WalletState {
  address: Address | null;
  chainId: number | null;
  error: string | null;
}

let state: WalletState = { address: null, chainId: null, error: null };
const listeners = new Set<() => void>();
const set = (p: Partial<WalletState>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};
export const walletStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => state,
};

const eth = (): Eip1193 | undefined => (typeof window === "undefined" ? undefined : (window as unknown as { ethereum?: Eip1193 }).ethereum);
let wired = false;

function wire(p: Eip1193) {
  if (wired) return;
  wired = true;
  p.on?.("accountsChanged", ((accs: string[]) => {
    if (accs[0]) rotateIsolationKey(); // new account → new circuit
    else clearIsolationKey();
    set({ address: (accs[0] as Address) ?? null });
  }) as never);
  p.on?.("chainChanged", ((id: string) => set({ chainId: parseInt(id, 16) })) as never);
}

export async function connect() {
  const p = eth();
  if (!p) return set({ error: "No browser wallet found. Install MetaMask, Rabby or similar." });
  try {
    const accs = (await p.request({ method: "eth_requestAccounts" })) as string[];
    const id = (await p.request({ method: "eth_chainId" })) as string;
    wire(p);
    rotateIsolationKey();
    set({ address: accs[0] as Address, chainId: parseInt(id, 16), error: null });
  } catch (e) {
    set({ error: e instanceof Error ? e.message : "Wallet connection rejected" });
  }
}

/** Silent re-attach (no prompt) if the site is already authorised. */
export async function reattach() {
  const p = eth();
  if (!p) return;
  try {
    const accs = (await p.request({ method: "eth_accounts" })) as string[];
    if (!accs[0]) return;
    const id = (await p.request({ method: "eth_chainId" })) as string;
    wire(p);
    rotateIsolationKey();
    set({ address: accs[0] as Address, chainId: parseInt(id, 16) });
  } catch { /* ignore */ }
}

export function disconnect() {
  clearIsolationKey();
  set({ address: null, chainId: null });
}

export async function switchToAppChain() {
  const p = eth();
  if (!p) return;
  const chainId = `0x${CHAIN.id.toString(16)}`;
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    // Re-read the live chain so the UI can't stay stale if the chainChanged event was missed.
    set({ chainId: parseInt((await p.request({ method: "eth_chainId" })) as string, 16) });
  } catch (e) {
    // 4902 = chain not added to the wallet yet: add it (wallet shows its own approval prompt), which also switches.
    if ((e as { code?: number }).code === 4902) {
      try {
        await p.request({
          method: "wallet_addEthereumChain",
          params: [{ chainId, chainName: CHAIN.name, nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: [CHAIN.rpc], blockExplorerUrls: [CHAIN.explorer] }],
        });
        return;
      } catch (e2) {
        set({ error: e2 instanceof Error ? e2.message : "Could not add network" });
        return;
      }
    }
    set({ error: e instanceof Error ? e.message : "Could not switch network" });
  }
}

export function getWalletClient() {
  const p = eth();
  if (!p || !state.address) throw new Error("Wallet not connected");
  return createWalletClient({ account: state.address, chain: VIEM_CHAIN, transport: custom(p) });
}
