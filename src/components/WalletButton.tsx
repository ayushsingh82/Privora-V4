"use client";
import { useState } from "react";
import { useWallet } from "@/lib/hooks";
import { connect, disconnect, switchToAppChain } from "@/lib/ethereum/wallet";
import { CHAIN } from "@/lib/ethereum/chains";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;


export default function WalletButton() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!w.address) {
    return (
      <button onClick={connect} className="flex items-center gap-2.5 rounded-md bg-accent py-3 pl-5 pr-6 text-sm font-semibold text-accent-fg shadow-lg shadow-accent/30 transition hover:brightness-110 active:scale-[.98]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h13M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M16 14h5v-4h-5a2 2 0 0 0 0 4z" /></svg>
        Connect wallet
      </button>
    );
  }
  const wrong = w.chainId !== null && w.chainId !== CHAIN.id;
  return (
    <div className="relative flex items-center gap-2">
      {wrong && (
        <button onClick={switchToAppChain} className="rounded-md bg-bad/15 px-3.5 py-2.5 text-sm font-semibold text-bad hover:bg-bad/25">Switch to {CHAIN.name}</button>
      )}
      <button onClick={() => setOpen((o) => !o)} className="mono flex items-center gap-2 rounded-md bg-card py-2.5 pl-4 pr-3.5 text-sm font-medium transition hover:bg-card2" aria-expanded={open}>
        {short(w.address)}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-none border border-line bg-card p-2 shadow-2xl shadow-black/60">
            <div className="px-3 py-2">
              <div className="text-xs text-muted">Connected wallet</div>
              <div className="mono mt-0.5 break-all text-xs">{w.address}</div>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(w.address!).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }} className="w-full rounded-none px-3 py-2.5 text-left text-sm hover:bg-card2">
              {copied ? "Copied" : "Copy address"}
            </button>
            <button onClick={() => { setOpen(false); disconnect(); }} className="w-full rounded-none px-3 py-2.5 text-left text-sm text-bad hover:bg-bad/10">Disconnect</button>
          </div>
        </>
      )}
    </div>
  );
}
