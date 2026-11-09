"use client";
import Link from "next/link";
import { useState } from "react";
import { CHAIN } from "@/lib/ethereum/chains";
import { spotPrice } from "@/lib/uniswap/pricing";
import type { Pool } from "@/lib/uniswap/pools";
import { PairIcons } from "./TokenIcon";

export const POOL_COLS = "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,.8fr)_auto]";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const sig = (n: number) => n.toLocaleString(undefined, { maximumSignificantDigits: 5 });

/** One v4 pool as a table row. Pool id and token addresses are tucked behind the chevron. */
export default function PoolCard({ p, index = 0 }: { p: Pool; index?: number }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const price = spotPrice(p.sqrtPriceX96); // token1 per ETH (decimals are equal: 18/18)
  const empty = p.liquidity === 0n;
  const copy = () => navigator.clipboard?.writeText(p.id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  const Label = ({ children }: { children: React.ReactNode }) => <div className="mb-1 text-[11px] uppercase tracking-wider text-muted md:hidden">{children}</div>;

  return (
    <div style={{ ["--d" as string]: `${Math.min(index, 10) * 70}ms` }} className="fade-up transition-colors hover:bg-card2/30">
      <div className={`grid items-center gap-x-6 gap-y-4 p-4 ${POOL_COLS}`}>
        <div className="flex items-center gap-3">
          <PairIcons a={p.token1} b={p.token0} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{p.token1.symbol} / {p.token0.symbol}</div>
            <div className="mt-0.5 flex gap-1.5 text-[11px] text-muted">
              <span className="rounded bg-card2 px-1.5 py-0.5">V4</span>
              <span className="rounded bg-card2 px-1.5 py-0.5">{p.fee / 10000}%</span>
              <span className="rounded bg-card2 px-1.5 py-0.5">no hook</span>
              {empty && <span className="rounded bg-bad/15 px-1.5 py-0.5 text-bad">Empty</span>}
            </div>
          </div>
        </div>

        <div className="text-sm">
          <Label>Price</Label>
          {price > 0 ? (
            <>
              <div className="mono">1 ETH = {sig(price)} {p.token1.symbol}</div>
              <div className="mono mt-0.5 text-xs text-muted">1 {p.token1.symbol} = {sig(1 / price)} ETH</div>
            </>
          ) : "–"}
        </div>

        <div className="text-sm">
          <Label>Liquidity (L)</Label>
          <span className="mono" title={p.liquidity.toString()}>{Number(p.liquidity).toExponential(3)}</span>
        </div>

        <div className="text-sm">
          <Label>Tick</Label>
          <span className="mono">{p.tick}</span>
          <span className="ml-2 text-xs text-muted">spacing {p.tickSpacing}</span>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link href={`/swap?from=${p.token0.address}&to=${p.token1.address}`} className="rounded-none bg-accent px-4 py-2 text-accent-fg transition hover:brightness-110">Swap</Link>
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Pool details" className="grid h-9 w-9 place-items-center rounded-none text-muted transition hover:bg-card2 hover:text-fg">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition ${open ? "rotate-180" : ""}`}><path d="M4 6l4 4 4-4" /></svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="mono flex flex-wrap gap-x-8 gap-y-2 bg-card2/40 px-4 py-3 text-xs text-muted">
          <span>Pool id {short(p.id)} <button onClick={copy} className="ml-1 rounded bg-card2 px-1.5 py-0.5 text-[10px] hover:bg-line">{copied ? "Copied" : "Copy"}</button></span>
          <span>{p.token1.symbol} <a className="text-fg underline" href={`${CHAIN.explorer}/token/${p.token1.address}`} target="_blank" rel="noreferrer">{short(p.token1.address)}</a></span>
          <span>PoolManager <a className="text-fg underline" href={`${CHAIN.explorer}/address/${CHAIN.poolManager}`} target="_blank" rel="noreferrer">{short(CHAIN.poolManager)}</a></span>
        </div>
      )}
    </div>
  );
}
