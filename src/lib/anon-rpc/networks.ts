// Source of truth: https://github.com/ethereum/anon-rpc/blob/main/adopters.json5 (copied from the verified ROUTIQ integration, 2026-11-06).
// `kind: "reference"` = does NOT anonymize and is never allowed in Anon-RPC mode.

export interface AnonNetwork {
  id: string;
  label: string;
  specifier: `0x${string}`;
  /** Chain the specifier contract lives on == chain the bootstrap RPC must read from. */
  specifierChainId: number;
  kind: "network" | "reference";
  config?: unknown;
  note: string;
}

export const NETWORKS: AnonNetwork[] = [
  {
    id: "nox",
    label: "Nox — Sphinx mixnet",
    specifier: "0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A",
    specifierChainId: 11155111,
    kind: "network",
    note: "Sphinx packets via entry/mix/exit nodes over KPS. Mixing delay per request.",
  },
  {
    id: "tor-js",
    label: "tor-js — Tor in WebAssembly",
    specifier: "0x700dA3193D35fA54Cd3fBf29B66f2a2A0385659e",
    specifierChainId: 1,
    kind: "network",
    config: { gateways: ["152.236.3.22:12298:uEiCH0VdbhryzJcMtCfB0vLA4sOvHdQ4hq5w7CopcwU59bQ"] },
    note: "Tor client in the sandbox; the demo gateway has limited capacity and may disappear.",
  },
  {
    id: "nym",
    label: "Nym — mixnet",
    specifier: "0x3aCD9742C68F6d993066Ae25533e09b9e1f60eD0",
    specifierChainId: 1,
    kind: "network",
    note: "Nym mixnet client in WASM (~18 MB, several seconds to bootstrap).",
  },
  {
    id: "passthrough",
    label: "Passthrough — NO anonymization (reference)",
    specifier: "0x4fd77be300f31c5fe6ab266d35d27750a3478d27",
    specifierChainId: 1,
    kind: "reference",
    note: "Plain fetch inside the sandbox. Demonstrates hash pinning only. Blocked in Anon-RPC mode.",
  },
];

/** Used ONCE by the harness to read the specifier contract. This read is NOT anonymized (and is logged as such). */
export const BOOTSTRAP_RPC: Record<number, string> = {
  1: "https://ethereum-rpc.publicnode.com",
  11155111: "https://ethereum-sepolia-rpc.publicnode.com",
};

export const DEFAULT_NETWORK = process.env.NEXT_PUBLIC_ANON_RPC_NETWORK || "nox";

export function getNetwork(id: string): AnonNetwork {
  const n = NETWORKS.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown Anon-RPC network: ${id}`);
  return n;
}
