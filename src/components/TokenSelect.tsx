"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_TOKENS, lookupToken, type Token } from "@/lib/tokens";
import { useTokenBalance, useWallet } from "@/lib/hooks";
import { formatUnits } from "viem";
import { friendly } from "@/lib/errors";
import TokenIcon from "./TokenIcon";

const custom: Token[] = []; // tokens the user added this session (validated onchain)

function Row({ t, onPick }: { t: Token; onPick: (t: Token) => void }) {
  const w = useWallet();
  const bal = useTokenBalance(t, w.address);
  return (
    <button onClick={() => onPick(t)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-card2/40">
      <TokenIcon symbol={t.symbol} address={t.address} size={32} />
      <span className="min-w-0 flex-1">
        <div className="font-medium">{t.symbol}</div>
        <div className="truncate text-xs text-muted">{t.name}</div>
      </span>
      <span className="mono text-xs text-muted">{bal.data !== undefined ? Number(formatUnits(bal.data, t.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 }) : ""}</span>
    </button>
  );
}

export default function TokenSelect({ value, onChange, exclude }: { value: Token | null; onChange: (t: Token) => void; exclude?: Token | null }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const list = [...DEFAULT_TOKENS, ...custom].filter(
    (t) => t.address !== exclude?.address && (!q || t.symbol.toLowerCase().includes(q.toLowerCase()) || t.name.toLowerCase().includes(q.toLowerCase()) || t.address.toLowerCase() === q.toLowerCase()),
  );
  const pick = (t: Token) => { onChange(t); setOpen(false); setQ(""); setErr(null); };

  async function add() {
    setBusy(true); setErr(null);
    try {
      const t = await lookupToken(q.trim());
      if (!DEFAULT_TOKENS.concat(custom).some((x) => x.address === t.address)) custom.push(t);
      pick(t);
    } catch (e) { setErr(friendly(e)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-2 rounded-md border border-line bg-card2 py-1.5 pl-2 pr-3 text-sm font-semibold">
        {value && <TokenIcon symbol={value.symbol} address={value.address} size={22} />}
        {value ? value.symbol : "Select token"} <span className="text-muted">▾</span>
      </button>
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="flex max-h-[85vh] w-full max-w-md flex-col border border-line bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-lg font-semibold">Select a token</span>
              <button onClick={() => setOpen(false)} aria-label="Close" className="px-1 text-muted hover:text-fg">✕</button>
            </div>
            <div className="relative px-5 pb-4">
              <svg className="pointer-events-none absolute left-9 top-1/2 -translate-y-[70%] text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input
                autoFocus value={q} onChange={(e) => { setQ(e.target.value); setErr(null); }}
                placeholder="Search name or paste address"
                className="w-full border border-line bg-card2 py-3 pl-11 pr-3 text-sm outline-none placeholder:text-muted/60"
              />
            </div>
            {!q && (
              <div className="flex flex-wrap gap-2 px-5 pb-4">
                {DEFAULT_TOKENS.filter((t) => t.address !== exclude?.address).slice(0, 6).map((t) => (
                  <button key={t.address} onClick={() => pick(t)} className="flex items-center gap-2 border border-line bg-card2 py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors hover:bg-line">
                    <TokenIcon symbol={t.symbol} address={t.address} size={20} />{t.symbol}
                  </button>
                ))}
              </div>
            )}
            <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto border-t border-line">
              {list.map((t) => <Row key={t.address} t={t} onPick={pick} />)}
              {list.length === 0 && /^0x[0-9a-fA-F]{40}$/.test(q.trim()) && (
                <div className="p-5">
                  <button onClick={add} disabled={busy} className="w-full bg-accent px-3 py-3 text-sm font-semibold text-accent-fg disabled:opacity-60">
                    {busy ? "Reading token from chain…" : "Look up & validate token onchain"}
                  </button>
                </div>
              )}
              {list.length === 0 && !/^0x[0-9a-fA-F]{40}$/.test(q.trim()) && <p className="p-5 text-sm text-muted">No match. Paste a token contract address to look it up.</p>}
            </div>
            {err && <p className="px-5 pt-3 text-xs text-bad">{err}</p>}
            <p className="px-5 py-3 text-[11px] text-muted">Symbol, name and decimals are read from the contract through the active read transport.</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
