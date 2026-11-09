"use client";
import { useState } from "react";
import Link from "next/link";
import { setSettings, useSettings } from "@/lib/settings";

const PRESETS = [10, 50, 100, 300];
const pct = (b: number) => `${b / 100}%`;

/** Slippage control for the swap card: shows the current value, opens a small panel with presets and a custom value. */
export default function SlippageButton() {
  const { slippageBps: bps } = useSettings();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const customBps = Math.round(Number(custom) * 100);
  const customOk = custom !== "" && Number.isFinite(customBps) && customBps >= 1 && customBps <= 5000;
  const apply = () => { if (customOk) { setSettings({ slippageBps: customBps }); setCustom(""); setOpen(false); } };
  const chip = (on: boolean) => `py-2.5 text-sm font-medium transition-colors ${on ? "bg-accent/15 text-accent" : "bg-card2 text-muted hover:bg-line hover:text-fg"}`;

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Slippage settings" aria-expanded={open} data-slippage={bps}
        className={`flex items-center gap-2 border border-line bg-card2 px-3 py-2 text-sm font-medium transition-colors hover:bg-line ${bps >= 500 ? "text-accent" : ""}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" /></svg>
        {pct(bps)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 border border-line bg-card p-4 shadow-2xl shadow-black/60">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Slippage tolerance</span>
              <span className="mono text-sm text-muted">{pct(bps)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">The most the price may move against you before the swap reverts.</p>
            <div className="mt-4 grid grid-cols-4 gap-px bg-line">
              {PRESETS.map((b) => <button key={b} onClick={() => { setSettings({ slippageBps: b }); setOpen(false); }} className={chip(bps === b)}>{pct(b)}</button>)}
            </div>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <input aria-label="Custom slippage" inputMode="decimal" placeholder="Custom" value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))} onKeyDown={(e) => e.key === "Enter" && apply()}
                  className="mono w-full border border-line bg-card2 py-2 pl-3 pr-7 text-sm outline-none placeholder:text-muted/60" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
              </div>
              <button onClick={apply} disabled={!customOk} className="bg-accent px-4 text-sm font-semibold text-accent-fg disabled:bg-card2 disabled:text-muted">Apply</button>
            </div>
            {custom !== "" && !customOk && <p className="mt-2 text-xs text-bad">Enter 0.01% to 50%.</p>}
            {bps >= 500 && <p className="mt-3 bg-accent/10 px-3 py-2 text-xs text-accent">High slippage can be sandwiched. Needed only for tokens that charge a transfer fee.</p>}
            <Link href="/settings" className="mt-3 block text-xs text-muted hover:text-fg">More settings</Link>
          </div>
        </>
      )}
    </div>
  );
}
