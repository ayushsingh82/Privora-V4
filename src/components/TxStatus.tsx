"use client";
import { CHAIN } from "@/lib/ethereum/chains";
import type { TxState } from "@/lib/ethereum/tx";

export default function TxStatus({ tx }: { tx: TxState }) {
  if (tx.phase === "idle") return null;
  const link = "hash" in tx && tx.hash ? (
    <a className="mono ml-1 underline" href={`${CHAIN.explorer}/tx/${tx.hash}`} target="_blank" rel="noreferrer">{tx.hash.slice(0, 10)}…</a>
  ) : null;
  const cls = tx.phase === "error" ? "border-bad/40 bg-bad/10 text-bad" : tx.phase === "done" ? "border-ok/40 bg-ok/10 text-ok" : "border-line bg-card2 text-muted";
  return (
    <div className={`mt-3 rounded-none border px-3 py-2 text-xs ${cls}`}>
      {tx.phase === "wallet" && <>Confirm “{tx.label}” in your wallet…</>}
      {tx.phase === "pending" && <>“{tx.label}” submitted by your wallet{link} — waiting for confirmation (receipt polled via read transport)</>}
      {tx.phase === "done" && <>“{tx.label}” confirmed{link}</>}
      {tx.phase === "error" && <>“{tx.label}” failed: {tx.message}{link}</>}
    </div>
  );
}
