// Anon-RPC worker lifecycle, fail-closed read transport and an honest request log. Browser-only.
// Nothing here is simulated: a request is logged "anon" only if it actually returned from worker.fetch().
// Request params are never logged (they contain wallet addresses); only the JSON-RPC method name.

import type { AnonRpcWorker as AnonRpcWorkerType } from "@anon-rpc/browser-harness";
import { BOOTSTRAP_RPC, getNetwork, DEFAULT_NETWORK, NETWORKS, type AnonNetwork } from "./networks.ts";

export type WorkerStatus = "idle" | "starting" | "ready" | "failed";
export type ReadMode = "anon" | "direct";
export type Transport = "anon" | "direct" | "bootstrap";

export interface LogEntry {
  id: number;
  ts: number;
  method: string;
  transport: Transport;
  ok: boolean;
  ms: number;
  error?: string;
}

export interface AnonState {
  networkId: string;
  kind: AnonNetwork["kind"] | null;
  status: WorkerStatus;
  error: string | null;
  mode: ReadMode;
  anonOk: number;
  anonFailed: number;
  directOk: number;
  directFailed: number;
  bootstrapOk: number;
  lastAnonAt: number | null;
  startedAt: number | null;
  readyAt: number | null;
  /** Boot attempt in progress (1-based), 0 when idle. Shown so a slow start is visible, not silent. */
  attempt: number;
  /** Number of distinct isolation keys handed to the worker this session (never the keys themselves). */
  isolationKeys: number;
  log: LogEntry[];
}

const LOG_MAX = 200;
const initial = (networkId = DEFAULT_NETWORK): AnonState => ({
  networkId,
  kind: null,
  status: "idle",
  error: null,
  mode: "anon",
  anonOk: 0,
  anonFailed: 0,
  directOk: 0,
  directFailed: 0,
  bootstrapOk: 0,
  lastAnonAt: null,
  startedAt: null,
  readyAt: null,
  attempt: 0,
  isolationKeys: 0,
  log: [],
});

export class PrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivacyError";
  }
}

let state: AnonState = initial();
let worker: AnonRpcWorkerType | null = null;
let seq = 0;
let generation = 0; // guards against a stale startWorker() finishing after a newer one began
const keys = new Set<string>();
const listeners = new Set<() => void>();

function set(patch: Partial<AnonState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function record(e: Omit<LogEntry, "id" | "ts">, patch: Partial<AnonState> = {}) {
  const entry: LogEntry = { id: ++seq, ts: Date.now(), ...e };
  set({ ...patch, log: [entry, ...state.log].slice(0, LOG_MAX) });
}

export const anonStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => state,
};

export function setReadMode(mode: ReadMode) {
  if (mode === state.mode) return;
  record({ method: `mode → ${mode === "anon" ? "Anon-RPC" : "Standard RPC"}`, transport: mode, ok: true, ms: 0 }, { mode });
}

// A cold public mixnet sometimes needs more than one try to open its first tunnels, and a worker can hang in "starting".
// So a boot has a watchdog, is retried, and (unless the user picked a network on purpose) fails over to the next
// ANONYMISING network. It never falls back to a direct connection: every network in the list is an anonymising one.
const BOOT_TIMEOUT_MS = 30_000;
const BOOT_ATTEMPTS = 3;          // on the requested network; other networks get one try each
const RECOVERY_DELAY_MS = 20_000;  // after a full failure, try again on its own
const RECOVERY_MAX = 12;
let recoveries = 0;

/** Networks to try, in order: the requested one first, then the other anonymising networks. */
export function bootOrder(first: string, failover = true): string[] {
  if (!failover) return [first];
  return [first, ...NETWORKS.filter((n) => n.kind === "network" && n.id !== first).map((n) => n.id)];
}

async function bootOnce(net: AnonNetwork, gen: number): Promise<void> {
  const bootstrapUrl = BOOTSTRAP_RPC[net.specifierChainId];
  const { AnonRpcWorker } = await import("@anon-rpc/browser-harness");
  const w = new AnonRpcWorker({
    address: net.specifier,
    config: net.config as never,
    preExisting: {
      rpcProvider: {
        request: async ({ method, params }: { method: string; params?: unknown }) => {
          const t0 = performance.now();
          try {
            const res = await fetch(bootstrapUrl, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params ?? [] }),
            });
            const j = await res.json();
            if (j.error) throw new Error(j.error.message ?? "bootstrap RPC error");
            record({ method: `${method} (specifier bootstrap)`, transport: "bootstrap", ok: true, ms: performance.now() - t0 }, { bootstrapOk: state.bootstrapOk + 1 });
            return j.result;
          } catch (e) {
            record({ method: `${method} (specifier bootstrap)`, transport: "bootstrap", ok: false, ms: performance.now() - t0, error: msg(e) });
            throw e;
          }
        },
      },
    },
  });
  worker = w;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      w.ready,
      new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error(`Worker did not become ready within ${BOOT_TIMEOUT_MS / 1000}s`)), BOOT_TIMEOUT_MS); }),
    ]);
  } catch (e) {
    try { w.close(); } catch { /* ignore */ }
    if (worker === w) worker = null;
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (gen !== generation) { try { w.close(); } catch { /* ignore */ } if (worker === w) worker = null; }
}

export async function startWorker(networkId: string = state.networkId, opts: { failover?: boolean } = {}): Promise<void> {
  stopWorker(false);
  const gen = ++generation;
  const order = bootOrder(getNetwork(networkId).id, opts.failover ?? true);
  const t0 = Date.now();
  let lastErr: unknown = new Error("Anon-RPC worker could not start");
  for (const id of order) {
    const net = getNetwork(id);
    const tries = id === order[0] ? BOOT_ATTEMPTS : 1;
    for (let attempt = 1; attempt <= tries; attempt++) {
      if (gen !== generation) return;
      set({ networkId: net.id, kind: net.kind, status: "starting", error: null, startedAt: t0, readyAt: null, attempt });
      try {
        await bootOnce(net, gen);
        if (gen !== generation) return; // superseded
        set({ status: "ready", readyAt: Date.now(), error: null, attempt: 0 });
        recoveries = 0;
        return;
      } catch (e) {
        lastErr = e;
        if (gen !== generation) return;
        await sleep(1500 * attempt);
      }
    }
  }
  if (gen !== generation) return;
  set({ status: "failed", attempt: 0, error: lastErr instanceof Error ? `${lastErr.name}: ${lastErr.message}` : String(lastErr) });
  // Public mixnets have bad minutes. Keep trying in the background so the app recovers without a click. Reads stay
  // blocked (fail-closed) the whole time; this only ever restarts the anonymising worker, never a direct connection.
  if (recoveries < RECOVERY_MAX) {
    recoveries++;
    setTimeout(() => { if (gen === generation && state.status === "failed") startWorker(networkId, opts).catch(() => { /* state shows it */ }); }, RECOVERY_DELAY_MS);
  }
  throw lastErr;
}

export function stopWorker(resetStatus = true) {
  generation++;
  try { worker?.close(); } catch { /* ignore */ }
  worker = null;
  if (resetStatus) set({ status: "idle", readyAt: null });
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200);

/** Test hook: simulate an unavailable worker without touching the network ("kill switch" in the Privacy Center). */
export function killWorker() {
  stopWorker(false);
  set({ status: "failed", error: "Worker stopped manually (fail-closed demo)" });
}

// Mixnet exits are fragile when hit with a burst of cold tunnel opens (one timeout can make the rest report
// "no exit"). So anonymised reads are queued with small concurrency and retried — always through Anon-RPC again.
const ANON_CONCURRENCY = 2;
const ANON_ATTEMPTS = 3;
let active = 0;
const waiting: Array<() => void> = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= ANON_CONCURRENCY) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}
let lastHeal = 0;
/** If the current session landed on a mixnet with no TLS-capable exit, re-learn the exit set by restarting the
 *  worker (cooldown-guarded). The retry still goes through Anon-RPC — this is never a direct fallback. */
function healWorker() {
  if (Date.now() - lastHeal < 30_000) return;
  lastHeal = Date.now();
  startWorker().catch(() => { /* surfaced via state.error */ });
}
const TRANSIENT = /NoTunnelExit|TunnelOpenTimeout|timed out|timeout|Tunnel|Circuit/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The single choke point for chain reads. Returns the JSON-RPC `result`.
 * - anon mode: needs a ready worker on a real anonymizing network; otherwise throws. NEVER falls back to direct.
 * - direct mode: explicit user opt-in; labelled "direct" in the log.
 * `isolationKey` (optional) separates circuits per wallet session.
 */
export async function rpcRead(url: string, method: string, params: unknown[], isolationKey?: string): Promise<unknown> {
  const t0 = performance.now();
  const mode = state.mode;
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  try {
    let res: Response;
    if (mode === "direct") {
      res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body });
    } else {
      if (!worker || state.status !== "ready") {
        throw new PrivacyError("Anon-RPC worker is not ready — refusing to fall back to direct RPC.");
      }
      if (state.kind !== "network") {
        throw new PrivacyError("Selected worker is a passthrough reference and does not anonymize.");
      }
      if (isolationKey && !keys.has(isolationKey)) {
        keys.add(isolationKey);
        set({ isolationKeys: keys.size });
      }
      const w = worker;
      res = await slot(async () => {
        let lastErr: unknown;
        for (let attempt = 1; attempt <= ANON_ATTEMPTS; attempt++) {
          if (worker !== w || state.status !== "ready") throw new PrivacyError("Anon-RPC worker stopped — refusing to fall back to direct RPC.");
          try {
            return await w.fetch(url, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body,
              ...(isolationKey ? { anonOptions: { isolationKey } } : {}),
            } as RequestInit);
          } catch (e) {
            lastErr = e;
            if (attempt === 2 && /NoTunnelExit/.test(msg(e))) healWorker();
            if (attempt === ANON_ATTEMPTS || !TRANSIENT.test(msg(e))) break;
            await sleep(1500 * attempt);
          }
        }
        throw lastErr;
      });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    if (j.error) throw new Error(j.error.message ?? "RPC error");
    const ms = performance.now() - t0;
    if (mode === "direct") record({ method, transport: "direct", ok: true, ms }, { directOk: state.directOk + 1 });
    else record({ method, transport: "anon", ok: true, ms }, { anonOk: state.anonOk + 1, lastAnonAt: Date.now() });
    return j.result;
  } catch (e) {
    const ms = performance.now() - t0;
    if (mode === "direct") record({ method, transport: "direct", ok: false, ms, error: msg(e) }, { directFailed: state.directFailed + 1 });
    else record({ method, transport: "anon", ok: false, ms, error: msg(e) }, { anonFailed: state.anonFailed + 1 });
    throw e;
  }
}
