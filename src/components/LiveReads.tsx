"use client";
import { useAnon } from "@/lib/hooks";

/** The most recent chain reads and the route each one took. New rows flash in, so the privacy layer is visible while you trade. */
const FRIENDLY: Record<string, string> = { eth_blockNumber: "latest block", eth_getBalance: "ETH balance", eth_gasPrice: "gas price", eth_call: "contract read", eth_estimateGas: "gas estimate", eth_getTransactionReceipt: "transaction receipt", eth_chainId: "chain id" };

export default function LiveReads({ wide = false, rows: max = 5, labels = false }: { wide?: boolean; rows?: number; labels?: boolean }) {
  const a = useAnon();
  const rows = a.log.slice(0, max);
  const label = (t: string) => (t === "anon" ? "Anon-RPC" : t === "direct" ? "Direct" : "Setup");
  return (
    <div className={`w-full bg-card p-5 ${wide ? "" : "max-w-md"}`} aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 animate-pulse rounded-full bg-ok" />Live reads</div>
        <div className="text-xs text-muted"><span className="mono text-fg">{a.anonOk}</span> private · <span className="mono text-fg">{a.directOk + a.directFailed}</span> direct</div>
      </div>
      <ul className="mt-4 space-y-1.5 text-xs">
        {rows.length === 0 && <li className="py-2 text-muted">Waiting for the first read…</li>}
        {rows.map((e) => (
          <li key={e.id} className="row-new flex items-center gap-3 bg-card2 px-3 py-2">
            <span className={`mono truncate ${labels ? "w-32" : "w-24"}`}>{e.method.replace(/ \(.*\)$/, "")}</span>
            {labels && <span className="w-28 truncate text-neutral-400">{FRIENDLY[e.method.replace(/ \(.*\)$/, "")] ?? ""}</span>}
            <span className={`px-2 py-0.5 ${e.transport === "anon" ? "bg-accent/15 text-accent" : e.transport === "direct" ? "bg-bad/15 text-bad" : "bg-line text-muted"}`}>{label(e.transport)}</span>
            <span className={`ml-auto ${e.ok ? "text-ok" : "text-bad"}`}>{e.ok ? "ok" : "failed"}</span>
            <span className="mono w-14 text-right text-muted">{e.ms ? `${Math.round(e.ms)}ms` : "-"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted">Method and route only. Never parameters or addresses.</p>
    </div>
  );
}
