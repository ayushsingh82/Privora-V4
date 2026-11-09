// Transaction flow: SUBMIT through the wallet (write path, not anonymised), then POLL the receipt through the read
// path (follows the selected privacy mode). The two transports are never mixed.
import type { Hash } from "viem";
import { readClient } from "./read-client";

export type TxState =
  | { phase: "idle" }
  | { phase: "wallet"; label: string }
  | { phase: "pending"; label: string; hash: Hash }
  | { phase: "done"; label: string; hash: Hash }
  | { phase: "error"; label: string; message: string; hash?: Hash };

/**
 * Waits for a receipt with ONE small request every few seconds. viem's waitForTransactionReceipt also polls block numbers
 * and whole blocks, which is a lot of traffic for a mixnet that takes seconds per request and makes reads time out.
 */
async function pollReceipt(hash: Hash, timeoutMs = 600_000, everyMs = 5_000) {
  const t0 = Date.now();
  for (;;) {
    try { return await readClient.getTransactionReceipt({ hash }); } catch { /* not mined yet, or a transient hiccup: try again */ }
    if (Date.now() - t0 > timeoutMs) throw new Error("Still waiting for the transaction to be mined. It may yet confirm: check the explorer.");
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

export async function runTx(label: string, send: () => Promise<Hash>, set: (s: TxState) => void): Promise<boolean> {
  let hash: Hash | undefined;
  try {
    set({ phase: "wallet", label });
    hash = await send();
    set({ phase: "pending", label, hash });
    const r = await pollReceipt(hash);
    if (r.status !== "success") throw new Error("Transaction reverted");
    set({ phase: "done", label, hash });
    return true;
  } catch (e) {
    const m = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : String(e);
    set({ phase: "error", label, message: m.slice(0, 240), hash });
    return false;
  }
}

/**
 * Picks the first candidate whose simulation (an eth_call through the READ transport) succeeds, so a doomed
 * transaction is never sent to the wallet. Throws the LAST candidate's error if none succeed (the most specific one).
 */
export async function firstValid<A>(cands: A[], sim: (a: A) => Promise<unknown>): Promise<A> {
  let last: unknown;
  for (const c of cands) {
    try { await sim(c); return c; } catch (e) { last = e; }
  }
  throw last;
}

/** Gas estimate (+30%) via the READ transport. Tokens with transfer fees/hooks routinely under-estimate; undefined = let the wallet decide. */
export async function bufferedGas(est: () => Promise<bigint>): Promise<bigint | undefined> {
  try { return ((await est()) * 130n) / 100n; } catch { return undefined; }
}
