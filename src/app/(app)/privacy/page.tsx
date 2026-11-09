"use client";
import Brackets, { Label } from "@/components/Brackets";
import { useState } from "react";
import { useAnon } from "@/lib/hooks";
import { CHAIN } from "@/lib/ethereum/chains";
import { getNetwork, NETWORKS } from "@/lib/anon-rpc/networks";
import { ModeToggle } from "@/components/ModeToggle";
import { killWorker, startWorker } from "@/lib/anon-rpc/manager";

const LABEL = { anon: "Anon-RPC", direct: "Direct RPC", bootstrap: "Direct (bootstrap)" } as const;
const COVERED = ["Balances and allowances", "Pool state, prices and quotes", "Token details", "Receipt polling"];
const NOT_COVERED = ["Wallet signing and sending", "Your address onchain", "One-time worker setup", "The page load itself"];

function PathLive({ status, mode, attempt }: { status: string; mode: string; attempt: number }) {
  const on = mode === "anon" && status === "ready";
  const nodes = mode === "anon"
    ? [{ t: "Your browser" }, { t: "Anon-RPC worker", w: true }, { t: "Mixnet exit" }, { t: "Ethereum RPC" }]
    : [{ t: "Your browser" }, { t: "Ethereum RPC" }];
  const ring = (w?: boolean) => (!w ? "border-line bg-card2" : status === "ready" ? "border-ok/50 bg-ok/10" : status === "failed" ? "border-bad/50 bg-bad/10" : "border-accent/50 bg-accent/10");
  return (
    <section className="fade-up relative bg-card p-5">
      <Brackets corners={["tl", "br"]} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Live read path</h2>
        <span className="text-xs text-muted">{mode !== "anon" ? "Standard: reads are direct" : on ? "Reads flow through Anon-RPC" : status === "failed" ? "Privacy layer unavailable" : attempt > 1 ? `Starting the worker (try ${attempt})` : "Starting the worker"}</span>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-0">
        {nodes.map((n, i) => (
          <div key={n.t} className="flex flex-1 flex-col items-stretch gap-3 md:flex-row md:items-center md:gap-0">
            <div className={`flex-1 border px-4 py-3 text-center text-sm font-semibold ${ring(n.w)} ${n.w && status === "starting" ? "animate-pulse" : ""}`}>{n.t}</div>
            {i < nodes.length - 1 && (
              <div className="relative mx-1 hidden h-0.5 w-10 shrink-0 overflow-hidden bg-line md:block">
                {(on || mode !== "anon") && <span style={{ ["--d" as string]: `${i * 350}ms` }} className={`wire-pulse absolute inset-y-0 w-3.5 ${mode === "anon" ? "bg-accent" : "bg-muted"}`} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PrivacyCenter() {
  const a = useAnon();
  const net = getNetwork(a.networkId);
  const [filter, setFilter] = useState<"all" | "anon" | "direct" | "failed">("all");
  const okAnon = a.log.filter((e) => e.transport === "anon" && e.ok);
  const avgMs = okAnon.length ? okAnon.reduce((t, e) => t + e.ms, 0) / okAnon.length : null;
  const counts = new Map<string, number>();
  for (const e of a.log) { const m = e.method.replace(/ \(.*\)$/, ""); counts.set(m, (counts.get(m) ?? 0) + 1); }
  const methods = [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5);
  const rows = a.log.filter((e) => filter === "all" || (filter === "anon" && e.transport === "anon") || (filter === "direct" && e.transport !== "anon") || (filter === "failed" && !e.ok));
  const maxMs = Math.max(1, ...a.log.map((e) => e.ms));
  const exportLog = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(a.log, null, 2)], { type: "application/json" }));
    const el = document.createElement("a"); el.href = url; el.download = "privora-request-log.json"; el.click(); URL.revokeObjectURL(url);
  };
  const workerTone = a.status === "ready" ? "bg-ok" : a.status === "failed" ? "bg-bad" : "bg-accent";
  const stats = [
    { id: "anon-ok", k: "Private reads", v: a.anonOk, c: "text-ok" },
    { id: "anon-failed", k: "Failed", v: a.anonFailed, c: a.anonFailed ? "text-bad" : "" },
    { id: "direct", k: "Direct reads", v: a.directOk + a.directFailed, c: "" },
    { id: "latency", k: "Avg latency", v: avgMs === null ? "-" : `${(avgMs / 1000).toFixed(1)}s`, c: "" },
  ];
  const chips = [
    ["Network", net.label.split(" — ")[0]],
    ["Chain", CHAIN.name],
    ["Integrity", a.status === "ready" ? "Verified" : a.status === "failed" ? "Failed" : "Pending"],
    ["Boot", a.readyAt && a.startedAt ? `${((a.readyAt - a.startedAt) / 1000).toFixed(1)}s` : "-"],
    ["Setup reads", String(a.bootstrapOk)],
  ];

  return (
    <div className="space-y-6">
      <div className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>PRIVACY</Label>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Privacy Center</h1>
          <p className="mt-1 text-sm text-muted">Live numbers from this session. Nothing here is estimated.</p>
        </div>
        <span className="flex items-center gap-2 border border-line bg-card px-3 py-1.5 text-xs text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-ok" />Live</span>
      </div>

      <PathLive status={a.status} mode={a.mode} attempt={a.attempt} />

      <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-5">
        <div className="fade-up bg-card p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Worker</div>
          <div data-worker={a.status} className="mt-2 flex items-center gap-2 text-2xl font-semibold capitalize"><span className={`h-2.5 w-2.5 rounded-full ${workerTone}`} />{a.status}</div>
        </div>
        {stats.map((c, i) => (
          <div key={c.id} style={{ ["--d" as string]: `${(i + 1) * 70}ms` }} className="fade-up bg-card p-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{c.k}</div>
            <div key={String(c.v)} data-stat={c.id} className={`pop mono mt-2 text-3xl font-semibold ${c.c}`}>{c.v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {chips.map(([k, v]) => <span key={k} className="border border-line bg-card px-3 py-1.5"><span className="text-muted">{k} </span><span className="font-medium">{v}</span></span>)}
      </div>
      {a.error && <div className="border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{a.error}</div>}

      <section className="border border-line bg-card p-5">
        <h2 className="font-semibold">Controls</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <ModeToggle />
          <select value={a.networkId} onChange={(e) => startWorker(e.target.value, { failover: false }).catch(() => {})} className="border border-line bg-card2 px-3 py-2">
            {NETWORKS.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <button onClick={() => startWorker().catch(() => {})} className="bg-card2 px-4 py-2 font-medium hover:bg-line">Restart worker</button>
          <button onClick={killWorker} className="border border-bad/50 px-4 py-2 font-medium text-bad hover:bg-bad/10" title="Fail-closed demo: reads fail visibly and never fall back to direct">Kill worker</button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="border border-line bg-card p-5">
          <h2 className="font-semibold">Requests by method</h2>
          {methods.length === 0 ? <p className="mt-3 text-sm text-muted">No requests yet.</p> : (
            <ul className="mt-4 space-y-2 text-sm">
              {methods.map(([m, n]) => (
                <li key={m} className="flex items-center gap-3">
                  <span className="mono w-32 truncate text-xs">{m}</span>
                  <span className="h-1.5 flex-1 bg-card2"><span className="block h-full bg-accent" style={{ width: `${(n / methods[0][1]) * 100}%` }} /></span>
                  <span className="mono w-8 text-right text-xs text-muted">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="border border-line bg-card p-5">
          <h2 className="font-semibold">Coverage</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ok">Anonymised</div>
              <ul className="space-y-1.5 text-muted">{COVERED.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-bad">Not anonymised</div>
              <ul className="space-y-1.5 text-muted">{NOT_COVERED.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Request activity</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {([["all", "All"], ["anon", "Anon-RPC"], ["direct", "Direct"], ["failed", "Failed"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 ${filter === k ? "bg-card2 text-fg" : "text-muted hover:text-fg"}`}>{l}</button>
            ))}
            <button onClick={exportLog} disabled={a.log.length === 0} className="border border-line px-3 py-1.5 text-muted hover:text-fg disabled:opacity-40">Export JSON</button>
          </div>
        </div>
        <div className="overflow-x-auto border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-xs text-muted">
              <tr><th className="px-4 py-2">Time</th><th className="px-4 py-2">Request</th><th className="px-4 py-2">Route</th><th className="px-4 py-2">Result</th><th className="px-4 py-2 text-right">ms</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">{a.log.length === 0 ? "No requests yet." : "Nothing matches this filter."}</td></tr>}
              {rows.map((e) => (
                <tr key={e.id} className="row-new border-t border-line">
                  <td className="mono whitespace-nowrap px-4 py-2 text-xs text-muted">{new Date(e.ts).toLocaleTimeString()}</td>
                  <td className="mono px-4 py-2 text-xs">{e.method}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 text-xs ${e.transport === "anon" ? "bg-accent/15 text-accent" : "bg-card2 text-muted"}`}>{LABEL[e.transport]}</span></td>
                  <td className={`px-4 py-2 text-xs ${e.ok ? "text-ok" : "text-bad"}`}>{e.ok ? "Success" : `Failed: ${e.error}`}</td>
                  <td className="px-4 py-2 text-right text-xs text-muted">
                    <span className="inline-flex items-center justify-end gap-2">
                      <span className="hidden h-1 w-16 bg-card2 sm:block"><span className="block h-full bg-accent/70" style={{ width: `${Math.min(100, (e.ms / maxMs) * 100)}%` }} /></span>
                      <span className="mono w-12">{e.ms ? Math.round(e.ms) : "—"}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
