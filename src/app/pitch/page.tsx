"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Logo from "@/components/Logo";
import Brackets, { Label } from "@/components/Brackets";
import LiveReads from "@/components/LiveReads";
import { HeroAnimation } from "@/components/art";
import { useAnon } from "@/lib/hooks";
import { readClient } from "@/lib/ethereum/read-client";
import { CHAIN } from "@/lib/ethereum/chains";
import { FEATURED_TOKENS } from "@/lib/tokens";
import { erc20Abi, stateViewAbi } from "@/lib/uniswap/abis";
import { CURATED, keyFor, poolId } from "@/lib/uniswap/v4";

const A = "text-accent";
const BAD = "#fd4040", ACC = "#ccff00", OK = "#00c805";
const H = "font-semibold leading-[1.05] tracking-tight text-[clamp(28px,4vw,62px)]";
const HS = "font-semibold leading-[1.05] tracking-tight text-[clamp(26px,3.3vw,52px)]";
const P = "text-[clamp(13px,1.3vw,20px)] leading-relaxed text-neutral-400";
const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` });

/** Counts up from 0 when the slide appears. The numbers passed in are measured or counted, never invented. */
function CountUp({ to, ms = 1300, suffix = "" }: { to: number; ms?: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(to); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / ms); setN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{n}{suffix}</>;
}
function Stat({ to, prefix = "", suffix = "", label, delay = 0, tone = A }: { to: number; prefix?: string; suffix?: string; label: string; delay?: number; tone?: string }) {
  return (
    <div style={d(delay)} className="fade-up relative bg-[#151515] p-5">
      <Brackets corners={["tl"]} size={14} />
      <div className={`mono text-[clamp(30px,3.6vw,56px)] font-semibold leading-none ${tone}`}>{prefix}<CountUp to={to} suffix={suffix} /></div>
      <p className="mt-3 text-[clamp(11px,1vw,15px)] leading-snug text-neutral-400">{label}</p>
    </div>
  );
}
const Card = ({ children, className = "", corners = ["tl"], delay = 0 }: { children: React.ReactNode; className?: string; corners?: string[]; delay?: number }) => (
  <div style={d(delay)} className={`fade-up relative bg-[#151515] ${className}`}><Brackets corners={corners} />{children}</div>
);
const List = ({ items, dot = "bg-accent", start = 0 }: { items: string[]; dot?: string; start?: number }) => (
  <ul className="space-y-2 text-[clamp(12px,1.2vw,18px)] text-neutral-300">
    {items.map((t, i) => <li key={t} style={d(start + i * 120)} className="chip-in flex gap-3"><span className={`mt-[0.55em] h-1.5 w-1.5 shrink-0 ${dot}`} />{t}</li>)}
  </ul>
);

/** After the wallet connects, every read call the app makes before a swap, each going out privately. Then the swap. Illustrative timing. */
function CallsFlow() {
  const D = "12s";
  const F = { fontFamily: "var(--font-geist-sans), system-ui" } as const;
  const calls = ["ETH balance", "Token balance", "Allowance", "Pool state", "Swap quote"];
  const route = "M104 170 L270 170 L350 136 L412 204 L474 170 L600 170";
  const win = (i: number) => [0.15 + i * 0.125, 0.15 + i * 0.125 + 0.1] as const;
  const stage = (label: string, x: number, a: number, b: number) => (
    <g>
      <text x={x} y="34" fontSize="12" letterSpacing="1.2" fill="#fff" fillOpacity=".3" style={F}>{label}
        <animate attributeName="fill-opacity" values={`.3;.3;1;1;.3;.3`} keyTimes={`0;${Math.max(a - 0.01, 0.001)};${a};${b};${b + 0.01};1`} dur={D} repeatCount="indefinite" />
        <animate attributeName="fill" values={`#fff;#fff;${ACC};${ACC};#fff;#fff`} keyTimes={`0;${Math.max(a - 0.01, 0.001)};${a};${b};${b + 0.01};1`} dur={D} repeatCount="indefinite" />
      </text>
      <rect x={x} y="44" width="150" height="3" fill={ACC} opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${Math.max(a - 0.01, 0.001)};${a};${b};${b + 0.01};1`} dur={D} repeatCount="indefinite" />
      </rect>
    </g>
  );
  return (
    <svg viewBox="0 0 760 380" className="h-auto w-full" role="img" aria-label="After the wallet connects, the app makes every read call privately, one after another, before any swap">
      {stage("1  CONNECT WALLET", 0, 0, 0.13)}
      {stage("2  PRIVATE CALLS", 250, 0.13, 0.8)}
      {stage("3  SWAP", 560, 0.8, 1)}

      {/* wallet */}
      <rect x="0" y="130" width="104" height="80" fill="#1d1d1d" stroke="#2a2a2a" strokeWidth="2" />
      <text x="52" y="164" textAnchor="middle" fontSize="12" fill="#e5e5e5" style={F}>Your wallet</text>
      <g opacity="0"><animate attributeName="opacity" values="0;0;1;1" keyTimes="0;.03;.06;1" dur={D} repeatCount="indefinite" />
        <circle cx="52" cy="188" r="9" fill={OK} fillOpacity=".25" /><path d="M47 188l4 4 7-8" fill="none" stroke={OK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* the private path */}
      <line x1="104" y1="170" x2="600" y2="170" stroke="#2a2a2a" strokeWidth="2" strokeDasharray="4 8" />
      {[[350, 136], [412, 204]].map(([x, y]) => <g key={`${x}`} transform={`translate(${x},${y})`}><rect x="-8" y="-8" width="16" height="16" transform="rotate(45)" fill="#1d1d1d" stroke={ACC} strokeWidth="1.6" /><circle r="2.6" fill={ACC} className="net-node" /></g>)}
      <g transform="translate(236,170)">
        <path d="M0 -42 31 -30v26c0 22-14 38-31 46-17-8-31-24-31-46v-26z" fill={ACC} fillOpacity=".16" stroke={ACC} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M-11 0l8 8 15-17" fill="none" stroke={ACC} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="236" y="236" textAnchor="middle" fontSize="12" fontWeight="600" fill={ACC} style={F}>Anon-RPC</text>

      {/* provider */}
      <rect x="600" y="120" width="160" height="100" fill="#151515" stroke={OK} strokeOpacity=".6" strokeWidth="2" />
      <text x="612" y="142" fontSize="12" fontWeight="600" fill="#e5e5e5" style={F}>RPC provider</text>
      <text x="612" y="172" fontSize="12" fill={OK} style={F}>sees an anonymous exit</text>
      <text x="612" y="192" fontSize="11" fill="#8a8a95" style={F}>not who is asking</text>

      {/* the five calls: each lights up as its packet goes out */}
      {calls.map((c, i) => {
        const [a0, a1] = win(i);
        return (
          <g key={c}>
            <g transform={`translate(${i * 152},280)`}>
              <rect width="140" height="40" fill="#151515" stroke="#2a2a2a" />
              <rect width="140" height="40" fill={ACC} opacity="0">
                <animate attributeName="opacity" values={`0;0;.22;.22;0;0`} keyTimes={`0;${a0};${a0 + 0.02};${a1 + 0.1};${a1 + 0.12};1`} dur={D} repeatCount="indefinite" />
              </rect>
              <text x="70" y="25" textAnchor="middle" fontSize="12" fill="#e5e5e5" style={F}>{c}</text>
            </g>
            <g>
              <animateMotion dur={D} repeatCount="indefinite" path={route} keyPoints="0;0;1;1" keyTimes={`0;${a0};${a1};1`} calcMode="linear" />
              <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes={`0;${a0};${a0 + 0.005};${a1};${a1 + 0.005};1`} dur={D} repeatCount="indefinite" />
              <rect x="-6" y="-6" width="12" height="12" fill={ACC} />
              <g transform="translate(-48,-30)"><rect width="96" height="18" fill={ACC} opacity=".16" stroke={ACC} /><text x="48" y="13" textAnchor="middle" fontSize="10" fontWeight="600" fill={ACC} style={F}>{c}</text></g>
            </g>
          </g>
        );
      })}

      {/* then the swap: the wallet's own path */}
      <g transform="translate(300,336)" opacity="0">
        <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;.8;.84;1" dur={D} repeatCount="indefinite" />
        <rect width="160" height="34" fill="#fff" /><text x="80" y="22" textAnchor="middle" fontSize="12" fontWeight="700" fill="#000" style={F}>SWAP</text>
        <text x="172" y="22" fontSize="12" fill="#c9c9d1" style={F}>signed and sent by your wallet</text>
      </g>
      <text x="380" y="372" textAnchor="middle" fontSize="11" fill="#8a8a95" style={F} />
    </svg>
  );
}

/** Five different real reads through the real worker, so the numbers and the calls in the deck are live. */
function LiveProof() {
  const a = useAnon();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const ready = a.mode === "anon" && a.status === "ready";
  const usdc = FEATURED_TOKENS[0];
  const run = async () => {
    setBusy(true); setDone(0);
    const t = <T,>(p: Promise<T> | T) => Promise.resolve(p).catch(() => undefined).finally(() => setDone((n) => n + 1));
    await Promise.all([
      t(readClient.getBlockNumber()),
      t(readClient.getBalance({ address: "0x000000000000000000000000000000000000dEaD" })),
      t(readClient.getGasPrice()),
      t(CURATED[0] ? readClient.readContract({ address: CHAIN.stateView, abi: stateViewAbi, functionName: "getLiquidity", args: [poolId(keyFor(CURATED[0]))] }) : undefined),
      t(usdc ? readClient.readContract({ address: usdc.address, abi: erc20Abi, functionName: "symbol" }) : undefined),
    ]);
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent">TRY IT LIVE</p>
          <p className="mt-1 text-[clamp(12px,1.1vw,16px)] text-neutral-400">Five different real reads, through the real worker.</p>
        </div>
        <button onClick={run} disabled={!ready || busy} className="shrink-0 bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-40">
          {busy ? `Reading ${done}/5…` : ready ? "Make private reads" : "Starting…"}
        </button>
      </div>
      <LiveReads wide rows={5} labels />
    </div>
  );
}

const SLIDES: { notes: string; body: React.ReactNode }[] = [
  {
    notes: "Start with the contrast. Private transactions protect how you submit. But before every submit your wallet asks questions: balances, allowances, prices, pools. Then land the line: your swaps are public, your queries do not have to be. Before any trade your wallet asks an RPC provider for balances, allowances, liquidity and prices, and those requests can expose metadata that links your IP address to the wallets you research. Then the one-line promise: privacy infrastructure for the activity before the transaction.",
    body: (
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <Label>UNISWAP V4 · PRIVATE CALLS</Label>
          <p style={d(200)} className="chip-in mt-5 text-[clamp(16px,1.9vw,28px)] text-neutral-400">Private transactions protect <span className="text-white">how you submit.</span></p>
          <p style={d(1500)} className="chip-in mt-3 max-w-xl text-[clamp(14px,1.5vw,22px)] leading-snug text-neutral-400">But before every submit, your wallet asks questions: <span className="mono text-neutral-200">balances, allowances, prices, pools.</span></p>
          <h1 style={d(3000)} className={`fade-up mt-6 ${H}`}>Uniswap v4 calls are public. <span className={A}>Who is asking doesn&apos;t have to be.</span></h1>
          <p style={d(3900)} className="fade-up mt-6 text-[clamp(16px,1.8vw,26px)] font-medium">Privacy infrastructure for the activity <span className={A}>before the transaction.</span></p>
          <div className="mt-5 grid gap-3 text-[clamp(12px,1.15vw,17px)]">
            <div className="flex flex-wrap items-center gap-3">
              <span style={d(4300)} className="chip-in w-24 text-xs font-semibold tracking-[0.2em] text-accent">FOR WHOM</span>
              {["Researchers", "Trading firms", "AI agents", "Any dApp"].map((t, i) => <span key={t} style={d(4450 + i * 180)} className="chip-in bg-[#151515] px-4 py-2 text-neutral-100">{t}</span>)}
            </div>
          </div>
        </div>
        <HeroAnimation className="hidden h-auto w-full lg:block" />
      </div>
    ),
  },
  {
    notes: "Before a swap your wallet asks the blockchain a handful of simple questions: how much ETH, how many tokens, what the router may spend, what is in the pool, what the price is. In our own demo, one quote plus one swap produced about twenty of these reads. Each question can carry your IP address, the wallet you asked about and when you asked. Private transaction systems protect the submit; these questions are a separate layer.",
    body: (
      <div>
        <Label>THE PROBLEM</Label>
        <h2 className={`mt-4 ${H}`}>Private transactions. <span className={A}>But what about everything before them?</span></h2>
        <div className="mt-7 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-6" delay={100}>
            <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500">WHAT YOUR WALLET ASKS BEFORE A SWAP</p>
            <ul className="mt-5 space-y-3">
              {[["eth_getBalance", "How much ETH does this wallet hold?"], ["balanceOf", "How many USDC does it hold?"], ["allowance", "What is the router allowed to spend?"], ["getReserves", "What is inside this pool?"], ["getAmountsOut", "What is the price right now?"]].map(([m, q], i) => (
                <li key={m} style={d(300 + i * 280)} className="chip-in flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="mono w-40 shrink-0 bg-black px-3 py-1.5 text-[clamp(11px,1vw,15px)] text-accent">{m}</span>
                  <span className="text-[clamp(13px,1.25vw,19px)] text-neutral-200">{q}</span>
                </li>
              ))}
            </ul>
          </Card>
          <div className="grid content-start gap-4">
            <Stat to={20} prefix="≈" label="reads in one quote and swap, measured in our demo" delay={500} />
            <Card corners={["br"]} className="p-5" delay={700}>
              <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-neutral-500">EACH QUESTION CAN REVEAL</p>
              <List dot="bg-bad" start={900} items={["Your IP address", "The wallet you asked about", "When you asked"]} />
            </Card>
          </div>
        </div>
        <p style={d(1500)} className="fade-up mt-6 text-[clamp(15px,1.9vw,28px)] font-medium">Private transactions protect the submit. <span className={A}>Privora protects the questions before it.</span></p>
      </div>
    ),
  },
  {
    notes: "Watch the order. First the wallet connects. Then, before any swap, the app makes all of its read calls: ETH balance, token balance, allowance, pool state and the swap quote. Each one goes out through Anon-RPC, so the provider sees an anonymous exit, not who is asking. Only then does the wallet sign and send the swap. Five kinds of reads are made private, with no contract changes: it is the real Uniswap v4, and your wallet signs and submits as usual.",
    body: (
      <div>
        <Label>THE SOLUTION</Label>
        <h2 className={`mt-4 ${H}`}>Introducing Privora. <span className={A}>Privacy before the transaction.</span></h2>
        <div className="mt-6 grid items-center gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Card className="p-4 sm:p-6"><CallsFlow /></Card>
          <div className="grid grid-cols-2 gap-3">
            <Stat to={5} label="kinds of reads made private" delay={200} />
            <Stat to={0} label="contracts changed: the real Uniswap v4" delay={320} tone="text-ok" />
            <Card className="col-span-2 p-4" delay={440}>
              <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-accent">WHAT WE MAKE PRIVATE</p>
              <div className="flex flex-wrap gap-2 text-[clamp(11px,1.05vw,15px)]">
                {["ETH balance", "Token balance", "Allowances", "Pool state", "Swap quotes"].map((t, i) => <span key={t} style={d(600 + i * 180)} className="chip-in bg-black px-3 py-1.5 text-neutral-100">{t}</span>)}
              </div>
              <p className="mt-4 text-[clamp(11px,1vw,14px)] text-neutral-500">Your wallet still signs and submits the swap as usual.</p>
            </Card>
          </div>
        </div>
        <p style={d(1000)} className="fade-up mt-6 text-[clamp(15px,1.9vw,28px)] font-medium">Same Uniswap. <span className={A}>Private questions.</span></p>
        <p style={d(1400)} className="fade-up mt-2 text-[clamp(12px,1.15vw,17px)] text-neutral-400">For researchers, trading firms, AI agents and any dApp whose users ask before they sign.</p>
      </div>
    ),
  },
  {
    notes: "Three steps. Your wallet connects to Privora. Privora asks its questions through Anon-RPC, one function carries every read and fails closed if the worker is down. Your wallet signs and submits the swap on its normal path. A quote costs a single request, a stuck worker restarts itself after thirty seconds, and three anonymising networks are supported. Click Make a private read to watch a real call go through the real worker, with its real latency.",
    body: (
      <div>
        <Label>HOW IT WORKS</Label>
        <h2 className={`mt-3 ${HS}`}>Three steps. <span className={A}>Nothing else changes.</span></h2>
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="relative">
            <div style={d(300)} className="grow-y absolute left-[15px] top-4 h-[calc(100%-2rem)] w-0.5 bg-accent/50" />
            <ol className="space-y-3">
              {[
                ["Your wallet connects", "Any Ethereum wallet, as on any dapp."],
                ["Anon-RPC carries the questions", "Balances, allowances, pool state and quotes go through one private path. If it is down, reads stop. No quiet fallback."],
                ["Your wallet signs the swap", "It submits on its own path, exactly as before."],
              ].map(([t, x], i) => (
                <li key={t} style={d(200 + i * 350)} className="fade-up relative pl-12">
                  <span className="absolute left-0 top-3 grid h-8 w-8 place-items-center bg-accent font-mono text-sm font-bold text-black">{i + 1}</span>
                  <div style={{ ["--d" as string]: `${i * 2}s` }} className="stepglow relative bg-[#151515] p-4">
                    <Brackets corners={["tl"]} size={12} />
                    <p className="font-medium text-[clamp(14px,1.4vw,21px)]">{t}</p>
                    <p className="mt-1.5 text-[clamp(12px,1.05vw,16px)] leading-snug text-neutral-400">{x}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 grid grid-cols-3 gap-2 pl-12">
              {[["1", "request per quote"], ["30s", "stuck worker restarts"], ["3", "networks supported"]].map(([n, l], i) => (
                <div key={l} style={d(1300 + i * 150)} className="chip-in bg-[#151515] px-3 py-2">
                  <p className="mono text-[clamp(16px,1.7vw,26px)] font-semibold text-accent">{n}</p>
                  <p className="text-[clamp(10px,0.9vw,13px)] leading-tight text-neutral-400">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <LiveProof />
        </div>
      </div>
    ),
  },
  {
    notes: "Whales and trading firms researching competitor wallets. DeFi users and onchain researchers checking balances and allowances. AI agents that continuously read wallets, pools and contracts. The comparison: private transaction services protect submission, Privora protects reads. They are complementary layers.",
    body: (
      <div>
        <Label>WHO NEEDS PRIVORA</Label>
        <h2 className={`mt-3 ${HS}`}>Built for everyone who <span className={A}>researches before they trade.</span></h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["01", "Whales and trading firms", "Researching a competitor's wallet shows your interest before you trade.", "Look it up with your IP address not attached to the question."],
            ["02", "DeFi users and researchers", "Checking balances and allowances links your IP to the wallets you own.", "Do the same with an extra layer of network privacy."],
            ["03", "AI trading agents", "Agents read wallets, pools and contracts all day and leave a trail.", "Private read infrastructure for automated research."],
          ].map(([n, t, prob, out], i) => (
            <Card key={t} corners={[i % 2 ? "br" : "tl"]} className="overflow-hidden p-5" delay={i * 180}>
              <span aria-hidden className="pointer-events-none absolute -right-1 -top-4 select-none font-mono text-7xl font-bold text-accent opacity-[0.08]">{n}</span>
              <p className="relative font-medium text-[clamp(16px,1.6vw,25px)]">{t}</p>
              <p className="relative mt-4 text-[10px] font-semibold tracking-[0.2em] text-bad">THEIR PROBLEM</p>
              <p className="relative mt-1 text-[clamp(12px,1.1vw,16px)] leading-snug text-neutral-300">{prob}</p>
              <p className="relative mt-4 text-[10px] font-semibold tracking-[0.2em] text-accent">WITH PRIVORA</p>
              <p className="relative mt-1 text-[clamp(12px,1.1vw,16px)] leading-snug text-neutral-100">{out}</p>
            </Card>
          ))}
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-accent">WHAT YOU CAN DO WITH PRIVORA</p>
          <div className="grid gap-px bg-white/10 sm:grid-cols-2">
            {[
              ["Research a wallet", "Look up any wallet without your IP address attached to the question."],
              ["Check a token before buying", "Read its price and pool without signalling what you are watching."],
              ["Review your own holdings", "See balances and allowances without tying them to your network identity."],
              ["Let an agent monitor pools", "Private reads for automated research, no profile of what it watches."],
            ].map(([t, x], i) => (
              <div key={t} style={d(700 + i * 160)} className="chip-in bg-[#151515] px-4 py-3">
                <p className="font-medium text-[clamp(13px,1.25vw,19px)]">{t}</p>
                <p className="mt-1 text-[clamp(11px,1.05vw,15px)] leading-snug text-neutral-400">{x}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={d(1300)} className="fade-up mt-4 text-[clamp(14px,1.6vw,24px)] font-medium">Works alongside private transaction tools. <span className={A}>A different layer.</span></p>
      </div>
    ),
  },
  {
    notes: "Who are we protecting? Anyone who researches before they trade: everyday users and researchers, whales and trading firms, AI agents, and any app whose users ask questions before they sign. And anyone can integrate, because we designed it that way. The private read path is a single transport: this is how Privora's own reads work, and any viem app can plug in the same way. Our end goal is private reads as base infrastructure, so DeFi is private from the base up. To get there we need a packaged SDK, dependable private-read infrastructure, and wallets and dApps that default to private reads. Every transaction leaves a footprint. The queries before it deserve better privacy. Now let me show it live.",
    body: (
      <div>
        <Label>BUILT FOR EVERYONE</Label>
        <h2 className={`mt-3 ${HS}`}>Built so <span className={A}>anyone can integrate.</span></h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Card className="p-5" delay={100}>
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-accent">WHO WE ARE PROTECTING</p>
            <ul className="space-y-2.5 text-[clamp(13px,1.3vw,20px)]">
              {["Everyday users and onchain researchers", "Whales and trading firms", "AI agents that read onchain data", "Any app whose users ask questions before they sign"].map((t, i) => (
                <li key={t} style={d(300 + i * 220)} className="chip-in flex gap-3"><span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 bg-accent" />{t}</li>
              ))}
            </ul>
          </Card>
          <Card corners={["br"]} className="p-5" delay={300}>
            <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-accent">THE INTEGRATION IS ONE TRANSPORT</p>
            <pre style={d(700)} className="chip-in mono overflow-x-auto bg-black p-3 text-[clamp(10px,0.95vw,14px)] leading-snug text-neutral-300">{`const client = createPublicClient({
  transport: custom({
    request: ({ method, params }) =>
      `}<span className={A}>rpcRead</span>{`(url, method, params),
  }),
});`}</pre>
            <p style={d(1100)} className="chip-in mt-3 text-[clamp(11px,1.05vw,15px)] text-neutral-400">This is how Privora&apos;s own reads work. Any viem app can plug in the same way.</p>
          </Card>
        </div>
        <div style={d(1500)} className="fade-up relative mt-4 bg-[#151515] p-5">
          <Brackets corners={["tl", "br"]} size={16} />
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
            <div className="max-w-xl">
              <p className="text-xs font-semibold tracking-[0.2em] text-accent">END GOAL</p>
              <p className="mt-1 text-[clamp(14px,1.5vw,23px)] font-semibold leading-snug">Private reads as base infrastructure, so DeFi is <span className={A}>private from the base up.</span></p>
            </div>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500">WHAT WE NEED TO BUILD</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[clamp(11px,1.05vw,15px)]">
                {["A packaged SDK: integrate in one line", "Dependable private-read infrastructure", "Wallets and dApps that default to private reads"].map((t, i) => <span key={t} style={d(1800 + i * 200)} className="chip-in bg-black px-3 py-1.5 text-neutral-100">{t}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div style={d(2500)} className="fade-up mt-4 text-center">
          <p className="mx-auto font-semibold leading-[1.15] tracking-tight text-[clamp(17px,2.1vw,34px)]">Every transaction leaves a footprint. <span className={A}>The queries before it deserve better privacy.</span></p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-6">
            <span className="flex items-center gap-3 text-[clamp(13px,1.3vw,20px)] font-semibold tracking-[0.22em]"><Logo size={28} />PRIVORA</span>
            <Link href="/swap" className="bg-accent px-7 py-3 text-sm font-semibold text-black transition hover:brightness-110">Open the live demo</Link>
          </div>
        </div>
      </div>
    ),
  },
];

export default function Pitch() {
  const [i, setI] = useState(0);
  const [notes, setNotes] = useState(false);
  const go = useCallback((n: number) => {
    const k = Math.min(SLIDES.length - 1, Math.max(0, n));
    setI(k);
    try { history.replaceState(null, "", `#${k + 1}`); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const h = parseInt(window.location.hash.slice(1), 10);
    if (h >= 1 && h <= SLIDES.length) setI(h - 1);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "BUTTON" && e.key === " ") return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(i + 1); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(i - 1); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(SLIDES.length - 1);
      else if (e.key.toLowerCase() === "n") setNotes((v) => !v);
      else if (e.key.toLowerCase() === "f") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <div aria-hidden className="app-grid pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-60" />
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-[4vw] py-5">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.22em]"><Logo size={24} />PRIVORA</Link>
      </div>
      <div key={i} className="fade-in relative h-full overflow-y-auto px-[5vw] pb-24 pt-20">
        <div className="mx-auto flex min-h-full max-w-[1500px] flex-col justify-center">{SLIDES[i].body}</div>
      </div>
      {notes && (
        <div className="absolute inset-x-0 bottom-16 z-20 mx-auto max-w-4xl bg-[#151515] p-5 text-[clamp(13px,1.2vw,18px)] leading-relaxed text-neutral-200 shadow-2xl shadow-black">
          <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-accent">SPEAKER NOTES</p>{SLIDES[i].notes}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="h-0.5 bg-white/10"><div className="h-full bg-accent transition-all duration-300" style={{ width: `${((i + 1) / SLIDES.length) * 100}%` }} /></div>
        <div className="flex items-center justify-between px-[4vw] py-3 text-sm">
          <span className="font-mono text-neutral-500">{i + 1} / {SLIDES.length}</span>
          <div className="flex gap-2">
            <button onClick={() => go(i - 1)} disabled={i === 0} className="bg-[#151515] px-4 py-2 text-neutral-300 hover:bg-[#1d1d1d] disabled:opacity-30">Back</button>
            <button onClick={() => go(i + 1)} disabled={i === SLIDES.length - 1} className="bg-white px-4 py-2 font-medium text-black hover:bg-neutral-200 disabled:opacity-30">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
