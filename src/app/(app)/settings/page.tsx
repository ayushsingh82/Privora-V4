"use client";
import Brackets, { Label } from "@/components/Brackets";
import { useState } from "react";
import { useSettings, setSettings } from "@/lib/settings";
import { useAnon } from "@/lib/hooks";
import { CHAIN } from "@/lib/ethereum/chains";
import { NETWORKS } from "@/lib/anon-rpc/networks";

const PRESETS = [10, 50, 100, 300, 1000, 2500];
const DEADLINES = [10, 20, 30, 60];
const pct = (bps: number) => `${bps / 100}%`;

function Card({ title, hint, children, i = 0 }: { title: string; hint?: string; children: React.ReactNode; i?: number }) {
  return (
    <section style={{ ["--d" as string]: `${i * 90}ms` }} className="fade-up rounded-none border border-line bg-card p-6">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Settings() {
  const s = useSettings();
  const a = useAnon();
  const net = NETWORKS.find((n) => n.id === a.networkId);
  const [custom, setCustom] = useState("");
  const customBps = Math.round(Number(custom) * 100);
  const customOk = custom !== "" && Number.isFinite(customBps) && customBps >= 1 && customBps <= 5000;
  const chip = (on: boolean) => `rounded-none border px-4 py-2 text-sm font-medium transition ${on ? "border-line bg-accent/15 text-accent" : "border-line text-muted hover:bg-card2 hover:text-fg"}`;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>SETTINGS</Label>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted">Stored only in this browser. Shared by Swap and Liquidity.</p>
        </div>
        <button onClick={() => { setSettings({ slippageBps: 50, deadlineMin: 20 }); setCustom(""); }} className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:bg-card2 hover:text-fg">Reset to defaults</button>
      </div>

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-none border border-line bg-line">
        {[["Max slippage", pct(s.slippageBps)], ["Deadline", `${s.deadlineMin} min`], ["Approvals", "Exact amount"]].map(([k, v]) => (
          <div key={k} className="bg-card px-5 py-4">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{k}</div>
            <div key={v} className="pop mono mt-1 text-lg font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <Card i={1} title="Slippage tolerance" hint="The most the price may move against you before the swap reverts.">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((b) => (
            <button key={b} onClick={() => { setSettings({ slippageBps: b }); setCustom(""); }} className={chip(s.slippageBps === b)}>{pct(b)}</button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <label className="text-muted" htmlFor="custom-slip">Custom</label>
          <div className="relative">
            <input id="custom-slip" inputMode="decimal" placeholder="e.g. 0.75" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))} className="mono w-32 rounded-none border border-line bg-card2 py-2 pl-3 pr-8 outline-none" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
          </div>
          <button disabled={!customOk} onClick={() => setSettings({ slippageBps: customBps })} className="rounded-none bg-accent px-4 py-2 font-semibold text-accent-fg disabled:bg-card2 disabled:text-muted">Apply</button>
          {custom !== "" && !customOk && <span className="text-xs text-bad">0.01% to 50%</span>}
        </div>
        {s.slippageBps >= 500 && <p className="mt-4 rounded-none bg-accent/10 px-3 py-2 text-xs text-accent">High slippage can be sandwiched. It is needed only for tokens that charge a transfer fee.</p>}
      </Card>

      <Card i={2} title="Transaction deadline" hint="A transaction that is not mined in time reverts instead of executing at a stale price.">
        <div className="flex flex-wrap items-center gap-2">
          {DEADLINES.map((m) => <button key={m} onClick={() => setSettings({ deadlineMin: m })} className={chip(s.deadlineMin === m)}>{m} min</button>)}
          <input type="number" min={1} max={180} value={s.deadlineMin} onChange={(e) => { const n = Math.floor(Number(e.target.value)); if (n >= 1 && n <= 180) setSettings({ deadlineMin: n }); }} className="mono ml-2 w-24 rounded-none border border-line bg-card2 px-3 py-2 text-sm outline-none" aria-label="Deadline in minutes" />
          <span className="text-sm text-muted">minutes (1 to 180)</span>
        </div>
      </Card>

      <Card i={3} title="What this means" hint="A worked example using your current settings.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-none bg-card2 p-4">
            <div className="text-xs uppercase tracking-wider text-muted">You get a quote for</div>
            <div className="mono mt-1 text-xl font-semibold">100.00 TOKEN</div>
          </div>
          <div className="rounded-none bg-card2 p-4">
            <div className="text-xs uppercase tracking-wider text-muted">You will receive at least</div>
            <div key={s.slippageBps} className="pop mono mt-1 text-xl font-semibold text-ok">{(100 - s.slippageBps / 100).toFixed(2)} TOKEN</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">If the price moves further than {pct(s.slippageBps)}, or the transaction is not mined within {s.deadlineMin} minutes, it reverts and you only pay gas.</p>
      </Card>

      <Card i={4} title="Safety defaults" hint="These are built in and not configurable.">
        <ul className="space-y-2 text-sm text-muted">
          {["Token approvals are for the exact amount, never unlimited.", "Swaps and removals are simulated before they reach your wallet.", "Token names and symbols come from the contract and are untrusted: verify the address."].map((t) => (
            <li key={t} className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />{t}</li>
          ))}
        </ul>
      </Card>

      <Card i={5} title="Network">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm text-muted">
          <dt>Chain</dt><dd className="mono text-right text-fg">{CHAIN.name} ({CHAIN.id})</dd>
          <dt>Universal Router</dt><dd className="mono break-all text-right text-xs text-fg">{CHAIN.universalRouter}</dd>
          <dt>PoolManager</dt><dd className="mono break-all text-right text-xs text-fg">{CHAIN.poolManager}</dd>
          <dt>Anon-RPC network</dt><dd className="mono text-right text-fg">{net?.label ?? a.networkId}</dd>
        </dl>
        <p className="mt-4 text-xs text-muted">Chain and RPC are set with environment variables (see .env.example). Change the Anon-RPC network in the Privacy Center.</p>
      </Card>
    </div>
  );
}
