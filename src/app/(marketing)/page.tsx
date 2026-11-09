import Link from "next/link";
import Reveal from "@/components/Reveal";
import CursorWave from "@/components/CursorWave";
import Brackets, { Label } from "@/components/Brackets";
import ProfileBuild from "@/components/ProfileBuild";
import { HeroAnimation, StepReadArt, StepVerifyArt, StepWalletArt } from "@/components/art";
import { CHAIN } from "@/lib/ethereum/chains";

const GH = "https://github.com/ayushsingh82/Privora";
const A = "text-accent";

const FEATURES = [
  {
    n: "01", corner: ["tl"], art: <StepReadArt />, title: "Reads go through Anon-RPC",
    body: <>Balances, allowances, pool state, quotes and receipts are fetched by a sandboxed worker that sends them through a <span className={A}>mixnet</span>. The RPC provider gets the question from an <span className={A}>anonymous exit</span>, not from you.</>,
  },
  {
    n: "02", corner: ["tr"], art: <StepWalletArt />, title: "Your wallet signs, as always",
    body: <>Approvals and swaps are signed and sent by your own wallet. Privora <span className={A}>never holds keys or funds</span>, and approvals are always for the <span className={A}>exact amount</span>.</>,
  },
  {
    n: "03", corner: ["bl"], art: null, title: "It fails closed",
    body: <>In Anon-RPC mode a read is <span className={A}>never sent directly</span>. If the privacy layer goes down, reads stop and you see why. A watchdog retries and switches between anonymising networks, <span className={A}>never to a normal RPC</span>.</>,
  },
  {
    n: "04", corner: ["br"], art: <StepVerifyArt />, title: "You can verify it",
    body: <>The Privacy page lists every request, the <span className={A}>route it took</span> and how long it took, and counts direct reads. In Anon-RPC mode that number <span className={A}>stays at zero</span>.</>,
  },
];

const RISKS = [
  ["Your identity gets tied to your wallet", "Your wallet address is pseudonymous until a lookup arrives with your IP address and location attached. That one link can turn an anonymous address into a person."],
  ["Your research becomes a signal", "Which tokens and pools you open, before you ever trade, shows what you are thinking about. That is valuable to anyone who wants to trade against you or target you."],
  ["A profile is easy to build and hard to undo", "Timing and frequency add up over months. The record sits with a company you never chose, and you cannot see or delete it."],
  ["Phishing and scams can be aimed", "Knowing which wallet belongs to which person, and what it holds, makes targeted scams and social engineering much more convincing."],
];

const ALTERNATIVES = [
  ["A VPN", "Hides your IP from the RPC provider, but you now trust the VPN company with the same picture: who you are and which wallets you check."],
  ["Mixers and private transfers", "Hide where money moves. They do nothing about the lookups you make before and after, which is where the leak is."],
  ["Running your own node", "Private, but heavy, slow to sync and out of reach for most people. Most wallets and dapps use a hosted provider by default."],
  ["Privora", "No new company to trust. Your lookups are wrapped and mixed through Anon-RPC, so the provider receives the question from an anonymous exit, and you can verify it."],
];

const AUDIENCE = [
  ["Anyone whose wallet should not be their identity", "Builders, public figures, DAO contributors and everyday users who keep their onchain life separate."],
  ["Traders who do not want their research tracked", "Look up any token or pool without telling a provider which ones you are watching."],
  ["Anyone who reads before they sign", "Which is everyone. Every swap starts with balance, allowance and price lookups."],
];

const EXPOSED = [
  ["Network identity", "Your IP address, rough location and browser accompany every request."],
  ["Wallet addresses", "Each balance and allowance check names a wallet you control."],
  ["Interests", "Token and pool lookups show what you are researching before you trade."],
  ["Habits", "Timing and frequency make your activity easy to profile over months."],
];

const FLOW = [
  { tag: "open", big: "Anon-RPC\nstarting", small: "A sandboxed worker boots and is verified. Reads begin only once it is ready." },
  { tag: "read", big: "quoteExactInput\nSingle", small: "Quotes come from the Uniswap v4 Quoter and pool state from StateView, onchain, through the mixnet. No price API." },
  { tag: "sign", big: "Your\nwallet", small: "Approve the exact amount and swap. The transaction is signed and sent by your wallet." },
  { tag: "verify", big: "Direct reads\n0", small: "The Privacy page counts every request. In Anon-RPC mode direct reads stay at zero." },
];

const LAYERS = [
  ["Interface", "A Next.js dashboard: swap, liquidity, pools, privacy and settings. No wallet library, the wallet is plain EIP-1193."],
  ["Read layer", "viem on a custom transport over one function, rpcRead(), the only path to the network. Reads are batched with Multicall3."],
  ["Anon-RPC worker", "A hash-pinned, sandboxed worker on a mixnet, with a fresh isolation key per wallet session, a boot watchdog and failover."],
  ["Wallet", "Signs approvals and swaps on a separate write path that is never mixed with reads."],
];

const COVERED = ["Balances and allowances", "Pool state, prices and quotes", "Token names, symbols and decimals", "Transaction receipt polling"];
const NOT_COVERED = ["Signing and sending your transaction", "Your address and trades onchain", "The one-time worker setup read", "Your wallet extension's own traffic"];

const FAQ = [
  ["Isn't a VPN enough?", "A VPN hides your IP address from the RPC provider, but then the VPN company sees which wallets and tokens you look up, and the link between you and them just moves. Anon-RPC sends your lookups through a mixnet instead, so there is no single company holding that picture."],
  ["Why not just run my own node?", "You can, and that is private. But a node is heavy to sync and run, and most people use the wallet and dapp defaults. Privora gives that privacy without any setup."],
  ["Does Privora hide my transactions?", "No. Transactions are signed and broadcast by your wallet and are public onchain, like on any dapp. Privora protects the lookups your browser makes before you trade: balances, allowances, pools and quotes."],
  ["Where do prices and quotes come from?", "From the Uniswap v4 Quoter contract itself. Privora calls quoteExactInputSingle onchain for the pool of your pair through Anon-RPC. There is no price API or aggregator in between."],
  ["Which pools does it use?", "Uniswap v4 pools (singleton PoolManager) on Robinhood Chain testnet by default. Tens of thousands of pools exist, so the Pools page shows a curated list of funded ETH pools with live price and liquidity from StateView. This demo swaps ETH to and from those tokens."],
  ["Why is it slower than a normal dapp?", "Anon-RPC sends each lookup through a mixnet, which adds a few seconds per request. Privora batches many reads into one call with Multicall3 to keep this reasonable."],
  ["What if the privacy network is unavailable?", "Privora retries and can switch to another anonymising network. If none works, reads stop and you see why. You can then retry, or deliberately choose Standard RPC, which is labelled as direct."],
  ["Which networks are supported?", "Robinhood Chain testnet (46630) by default, and Robinhood Chain mainnet (4663) through configuration."],
];

function Card({ children, corners = ["tl"], className = "" }: { children: React.ReactNode; corners?: string[]; className?: string }) {
  return <div className={`relative bg-[#151515] ${className}`}><Brackets corners={corners} />{children}</div>;
}

export default function Home() {
  const contracts: [string, string][] = [["Uniswap v4 PoolManager", CHAIN.poolManager], ["Universal Router", CHAIN.universalRouter], ["V4 Quoter", CHAIN.quoter], ["StateView", CHAIN.stateView], ["Permit2", CHAIN.permit2]];
  return (
    <div className="w-full">
      {/* Hero */}
      <header className="relative isolate flex min-h-[88vh] flex-col overflow-hidden">
        <CursorWave className="absolute inset-0 -z-10 h-full w-full" />
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <span className="fade-up mb-9 inline-flex items-center gap-2.5 bg-[#151515] px-5 py-2.5 text-sm font-medium text-neutral-100">
            <span className="h-2 w-2 bg-accent" />
            Built on Uniswap v4 · Powered by <span className={A}>Anon-RPC</span>
          </span>
          <h1 style={{ ["--d" as string]: "80ms" }} className="fade-up text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Trade on Uniswap without telling an RPC provider <span className={A}>who you are.</span>
          </h1>
          <p style={{ ["--d" as string]: "160ms" }} className="fade-up mt-6 max-w-xl text-base leading-7 text-neutral-400 sm:text-lg">
            Every balance check and price lookup tells an RPC company who you are and which wallets you care about. Privora keeps those lookups private, so the swap stays public and the person behind it does not.
          </p>
          <div style={{ ["--d" as string]: "240ms" }} className="fade-up mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/swap" className="bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200">Open app</Link>
            <a href={`${GH}/blob/main/docs/ANON_RPC_INTEGRATION.md`} target="_blank" rel="noreferrer" className="border border-white/25 px-6 py-3 text-sm font-medium transition-colors hover:border-white/50">Docs</a>
          </div>
          <p style={{ ["--d" as string]: "320ms" }} className="fade-up mt-6 text-sm text-neutral-500">Non-custodial · Open source · Reads never fall back to a normal RPC</p>
        </div>
      </header>

      {/* Why: the problem in plain words */}
      <section id="why" className="px-6 py-24">
        <Reveal className="mx-auto max-w-5xl">
          <Label>WHY PRIVORA</Label>
          <h2 className="mb-6 mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Your wallet is public. <span className={A}>Who is looking at it should not be.</span></h2>
          <p className="max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">
            Blockchains are open, so anyone can read them. But you do not read them directly. Your wallet app asks an RPC provider for you, and that company learns who asked.
          </p>

          <div className="mt-12 grid items-start gap-10 lg:grid-cols-2">
            <div>
              <Card corners={["tl"]} className="p-7">
                <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500">AN EVERYDAY VERSION</p>
                <p className="mt-4 text-lg leading-8">It is like asking a librarian for one specific book, and handing over your ID card to do it. The book is public. <span className={A}>The library does not need to know who asked.</span></p>
              </Card>
              <dl className="mt-8 divide-y divide-white/10 border-y border-white/10">
                {EXPOSED.map(([t, d]) => (
                  <div key={t} className="grid gap-1 py-4 sm:grid-cols-[9.5rem_1fr] sm:gap-6">
                    <dt className="font-medium">{t}</dt>
                    <dd className="text-sm leading-6 text-neutral-400">{d}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <ProfileBuild />
          </div>

          <h3 className="mb-6 mt-20 text-2xl font-semibold tracking-tight">What that makes possible</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {RISKS.map(([t, d], i) => (
              <Card key={t} corners={[i % 2 === 0 ? "tl" : "br"]} className="p-7">
                <p className="font-medium">{t}</p>
                <p className="mt-3 text-sm leading-6 text-neutral-400">{d}</p>
              </Card>
            ))}
          </div>

          <h3 className="mb-2 mt-20 text-2xl font-semibold tracking-tight">Why the usual fixes do not close the gap</h3>
          <p className="mb-6 max-w-2xl text-sm leading-6 text-neutral-400">Each helps with something. None of them fixes the read path, which is the part every swap starts with.</p>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {ALTERNATIVES.map(([t, d], i) => (
              <div key={t} className={`grid gap-2 py-5 sm:grid-cols-[13rem_1fr] sm:gap-8 ${i === ALTERNATIVES.length - 1 ? "bg-accent/5 px-4" : ""}`}>
                <p className={`font-medium ${i === ALTERNATIVES.length - 1 ? A : ""}`}>{t}</p>
                <p className="text-sm leading-6 text-neutral-400">{d}</p>
              </div>
            ))}
          </div>

          <h3 className="mb-6 mt-20 text-2xl font-semibold tracking-tight">Who needs this</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {AUDIENCE.map(([t, d]) => (
              <div key={t} className="bg-[#151515] p-6">
                <p className="font-medium leading-snug">{t}</p>
                <p className="mt-3 text-sm leading-6 text-neutral-400">{d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 py-24">
        <Reveal className="mx-auto max-w-5xl">
          <span className="mb-5 inline-block bg-black text-xs font-semibold tracking-[0.2em] text-accent">HOW IT WORKS</span>
          <h2 className="mb-14 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Private lookups. Normal signing.</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <Card key={f.n} corners={f.corner} className="overflow-hidden p-8">
                <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 select-none font-mono text-8xl font-bold text-accent opacity-[0.08]">{f.n}</span>
                {f.art && <div className="relative mb-6 max-w-[280px]">{f.art}</div>}
                {!f.art && (
                  <div className="relative mb-6 flex h-10 w-10 items-center justify-center border border-white/10 bg-black text-accent">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" /></svg>
                  </div>
                )}
                <h3 className="relative text-lg font-medium">{f.title}</h3>
                <p className="relative mt-3 text-sm leading-6 text-neutral-400">{f.body}</p>
              </Card>
            ))}
          </div>
        </Reveal>
      </section>

      {/* The request */}
      <section id="request" className="px-6 py-24">
        <Reveal className="mx-auto max-w-5xl">
          <Label>THE REQUEST</Label>
          <h2 className="mb-4 mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">The same request, with and without Privora.</h2>
          <p className="mb-10 max-w-2xl text-sm leading-6 text-neutral-400">A normal dapp sends who you are along with every question. Privora strips that at the shield, re-wraps the request and mixes it, so the provider only sees an anonymous exit.</p>
          <Card corners={["tl", "br"]} className="p-4 sm:p-8"><HeroAnimation className="h-auto w-full" /></Card>
        </Reveal>
      </section>

      {/* The flow */}
      <section id="flow" className="px-6 py-24">
        <Reveal className="mx-auto max-w-5xl">
          <Label>THE FLOW</Label>
          <h2 className="mb-8 mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">From a cold start to a verified swap.</h2>
          <div className="mb-14 flex flex-wrap items-center gap-x-3 gap-y-2 text-xl text-neutral-600">
            {["Your browser", "Anon-RPC", "Mixnet exit", "RPC provider"].map((t, i) => (
              <span key={t} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden>→</span>}
                <span className={`inline-flex items-center gap-2.5 bg-[#151515] px-4 py-2.5 text-sm ${t === "Anon-RPC" ? "text-accent" : "text-neutral-100"}`}>{t === "Anon-RPC" && <span className="h-2 w-2 bg-accent" />}{t}</span>
              </span>
            ))}
          </div>
          <ol className="grid gap-5 lg:grid-cols-4">
            {FLOW.map((s, i) => (
              <li key={i}>
                <Card corners={["tl", "br"]} className="flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium text-accent">0{i + 1}</span>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">{s.tag}</span>
                  </div>
                  <p className="mt-6 whitespace-pre-line font-mono text-lg font-medium leading-tight">{s.big}</p>
                  <p className="mt-3 text-xs leading-5 text-neutral-400">{s.small}</p>
                </Card>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      {/* Architecture */}
      <section id="architecture" className="px-6 py-24">
        <Reveal className="mx-auto max-w-5xl">
          <Label>ARCHITECTURE</Label>
          <h2 className="mb-16 mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Four layers, one path to the network.</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {LAYERS.map(([n, d], i) => (
              <Card key={n} corners={["tl"]} className="flex min-h-[190px] flex-col p-7">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-accent">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-base font-medium">{n}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-400">{d}</p>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 bg-[#151515] p-6">
            <div>
              <p className="text-base font-medium">{CHAIN.name}</p>
              <p className="mt-1 text-xs text-neutral-500">Uniswap v4 PoolManager, Universal Router and pools, used unmodified. Anon-RPC reads, wallet writes.</p>
            </div>
          </div>
          <div className="mt-10">
            <p className="mb-3 text-xs tracking-[0.15em] text-neutral-500">{CHAIN.name.toUpperCase()} · CHAIN {CHAIN.id}</p>
            <div className="divide-y divide-white/10 border-y border-white/10 font-mono text-xs">
              {contracts.map(([label, addr]) => (
                <div key={label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className="min-w-[10rem] text-neutral-500">{label}</span>
                  <a href={`${CHAIN.explorer}/address/${addr}`} target="_blank" rel="noreferrer" className="break-all text-neutral-300 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-white/50">{addr}</a>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Security */}
      <section id="security" className="px-6 py-24">
        <Reveal className="mx-auto max-w-5xl">
          <Label>SECURITY</Label>
          <h2 className="mb-12 mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Clear about what it protects, and what it does not.</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[["Routed through Anon-RPC", COVERED, "bg-accent", ["tl"]], ["Not hidden by Privora", NOT_COVERED, "bg-neutral-500", ["br"]]].map(([h, items, dot, cs]) => (
              <Card key={h as string} corners={cs as string[]} className="p-7">
                <p className="font-medium">{h as string}</p>
                <ul className="mt-5 space-y-3 text-sm text-neutral-400">
                  {(items as string[]).map((t) => <li key={t} className="flex gap-3"><span className={`mt-2 h-1.5 w-1.5 shrink-0 ${dot}`} />{t}</li>)}
                </ul>
              </Card>
            ))}
          </div>
          <ul className="mt-10 grid gap-x-10 gap-y-4 text-sm leading-6 text-neutral-400 sm:grid-cols-2">
            {[["Fails closed.", " Reads are never sent directly in Anon-RPC mode."], ["Exact approvals.", " Never unlimited."], ["Simulated first.", " Reverts do not reach your wallet, so they cost no gas."], ["Checked by tests.", " Unit, fork and real-browser tests that count requests to the RPC host, plus real transactions on Sepolia."]].map(([b, t]) => <li key={b}><span className="font-medium text-white">{b}</span>{t}</li>)}
          </ul>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-24">
        <Reveal className="mx-auto max-w-3xl">
          <Label>FAQ</Label>
          <h2 className="mb-10 mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Questions</h2>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-medium">{q}<span className="text-accent transition group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm leading-6 text-neutral-400">{a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Closing */}
      <section className="relative isolate flex min-h-[60vh] items-center overflow-hidden">
        <CursorWave className="absolute inset-0 -z-10 h-full w-full" spacing={34} />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-black/40" />
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">Try it on Robinhood testnet. <span className={A}>Nothing to install</span> but a wallet.</h2>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-neutral-300 sm:text-base">Swap, add liquidity and watch the Privacy page keep direct reads at zero.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/swap" className="bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200">Open app</Link>
            <a href={GH} target="_blank" rel="noreferrer" className="border border-white/25 px-6 py-3 text-sm font-medium transition-colors hover:border-white/50">GitHub</a>
          </div>
        </div>
      </section>
    </div>
  );
}
