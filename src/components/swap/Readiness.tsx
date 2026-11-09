"use client";
import { formatEther } from "viem";
import Brackets from "@/components/Brackets";
import { CHAIN } from "@/lib/ethereum/chains";
import { ETH } from "@/lib/tokens";
import { connect, switchToAppChain } from "@/lib/ethereum/wallet";
import { useAnon, useTokenBalance, useWallet } from "@/lib/hooks";

const MIN_ETH = 10n ** 15n; // 0.001 ETH: enough for a small swap plus gas on this L2

/** A short "what's left before I can swap" list. Everything flips to done by itself once the wallet has testnet ETH. */
export default function Readiness() {
  const w = useWallet();
  const a = useAnon();
  const onChain = w.chainId === CHAIN.id;
  const bal = useTokenBalance(ETH, w.address && onChain ? w.address : null);
  const funded = bal.data !== undefined && bal.data >= MIN_ETH;
  const anonReady = a.mode === "anon" ? a.status === "ready" : true;

  type Row = { ok: boolean; label: string; hint?: string; action?: { text: string; run?: () => void; href?: string } };
  const rows: Row[] = [
    { ok: anonReady, label: a.mode === "anon" ? "Anon-RPC worker ready" : "Standard RPC (direct reads)", hint: a.status === "failed" ? "Worker failed — use the banner above to retry." : a.status === "starting" ? "Starting the mixnet worker…" : undefined },
    { ok: !!w.address, label: "Wallet connected", action: w.address ? undefined : { text: "Connect", run: connect } },
    { ok: !!w.address && onChain, label: `Network: ${CHAIN.name}`, action: w.address && !onChain ? { text: "Switch / add", run: switchToAppChain } : undefined },
    {
      ok: funded,
      label: CHAIN.testnet ? "Testnet ETH in wallet" : "ETH in wallet",
      hint: bal.data !== undefined ? `Balance: ${Number(formatEther(bal.data)).toLocaleString(undefined, { maximumFractionDigits: 5 })} ETH` : w.address && onChain ? "Checking balance through Anon-RPC…" : "Connect first",
      action: !funded && CHAIN.faucet ? { text: "Open faucet", href: CHAIN.faucet } : undefined,
    },
  ];
  if (rows.every((r) => r.ok)) return null; // all set: get out of the way

  return (
    <div className="relative w-full max-w-md bg-card p-4">
      <Brackets corners={["tl", "br"]} size={18} />
      <div className="mb-2 px-1 text-sm font-semibold">Before you swap</div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 px-1 text-sm">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${r.ok ? "bg-ok/20 text-ok" : "bg-card2 text-muted"}`}>{r.ok ? "✓" : "·"}</span>
            <span className="min-w-0 flex-1">
              <span className={r.ok ? "text-muted" : "text-fg"}>{r.label}</span>
              {r.hint && !r.ok && <span className="block text-xs text-muted">{r.hint}</span>}
              {r.hint && r.ok && <span className="block text-xs text-muted">{r.hint}</span>}
            </span>
            {r.action && (r.action.href
              ? <a href={r.action.href} target="_blank" rel="noreferrer" className="rounded-none bg-accent px-3 py-1 text-xs font-semibold text-accent-fg hover:brightness-110">{r.action.text}</a>
              : <button onClick={r.action.run} className="rounded-none bg-accent px-3 py-1 text-xs font-semibold text-accent-fg hover:brightness-110">{r.action.text}</button>)}
          </li>
        ))}
      </ul>
      {CHAIN.testnet && <p className="mt-3 px-1 text-xs text-muted">Testnet only: these tokens have no real value. Your ETH balance is read through Anon-RPC; the faucet is a normal website.</p>}
    </div>
  );
}
