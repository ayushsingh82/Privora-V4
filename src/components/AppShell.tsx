"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAnon } from "@/lib/hooks";
import Logo from "./Logo";
import WalletButton from "./WalletButton";
import PrivacyBanner from "./PrivacyBanner";

const I = {
  swap: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4",
  liquidity: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  pools: "M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5",
  privacy: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  settings: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
};
const GROUPS = [
  { title: "Trade", items: [
    { href: "/swap", label: "Swap", icon: I.swap },
    { href: "/liquidity", label: "Liquidity", icon: I.liquidity },
    { href: "/pools", label: "Pools", icon: I.pools },
  ] },
  { title: "Privacy", items: [
    { href: "/privacy", label: "Privacy", icon: I.privacy },
    { href: "/settings", label: "Settings", icon: I.settings },
  ] },
];
const NAV = GROUPS.flatMap((g) => g.items);
const Icon = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);

function Status() {
  const a = useAnon();
  const on = a.mode === "anon" && a.status === "ready";
  const starting = a.mode === "anon" && a.status === "starting";
  const failed = a.mode === "anon" && a.status === "failed";
  const label = a.mode !== "anon" ? "Standard RPC" : on ? "Anon-RPC active" : failed ? "Unavailable" : "Starting";
  const dot = a.mode !== "anon" ? "bg-muted" : on ? "bg-ok" : failed ? "bg-bad" : "bg-accent";
  const direct = a.directOk + a.directFailed;
  return (
    <Link href="/privacy" className="block bg-card2/60 p-4 transition hover:bg-card2" title="Open the Privacy page">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Read privacy</div>
      <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${dot} ${on ? "" : "animate-pulse"}`} />{label}</div>
      {starting && <div className="mt-3 h-0.5 w-full overflow-hidden bg-line"><div className="wire-pulse h-full w-1/3 bg-accent" /></div>}
      {!starting && (
        <div className="mt-3 grid grid-cols-2 gap-px bg-line text-center">
          <div className="bg-card py-2"><div className="mono text-base font-semibold">{a.anonOk}</div><div className="text-[10px] uppercase tracking-wider text-muted">Private</div></div>
          <div className="bg-card py-2"><div className="mono text-base font-semibold">{direct}</div><div className="text-[10px] uppercase tracking-wider text-muted">Direct</div></div>
        </div>
      )}
    </Link>
  );
}

/** The dashboard: sidebar on desktop, bottom tab bar on phones. No footer, no marketing. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (h: string) => path === h || path.startsWith(h + "/");
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 bg-card/50 p-5 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2 pt-1 text-lg font-semibold tracking-tight"><Logo size={34} />Privora</Link>
        <nav className="flex flex-col gap-6">
          {GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-1">
              <div className="px-3.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted/70">{g.title}</div>
              {g.items.map((n) => (
                <Link key={n.href} href={n.href} className={`relative flex items-center gap-3 px-3.5 py-3 text-sm transition-colors ${active(n.href) ? "bg-accent/15 font-semibold text-accent" : "text-muted hover:bg-card2 hover:text-fg"}`}>
                  {active(n.href) && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
                  <Icon d={n.icon} />{n.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <Status />
        </div>
      </aside>

      <div className="relative min-w-0">
        <div aria-hidden className="app-grid pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-bg/90 px-4 py-4 backdrop-blur lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden"><Logo size={30} />Privora</Link>
          <div className="hidden items-center gap-2 text-sm lg:flex"><span className="text-muted">Privora</span><span className="text-muted/50">/</span><span className="font-semibold">{NAV.find((n) => active(n.href))?.label ?? ""}</span></div>
          <WalletButton />
        </header>
        <div className="relative px-4 lg:px-8"><PrivacyBanner /></div>
        <main className="relative mx-auto max-w-5xl px-4 pb-28 pt-4 lg:px-8 lg:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 bg-card/95 px-2 pb-2 pt-1 shadow-[0_-8px_24px_rgba(0,0,0,.4)] backdrop-blur lg:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 rounded-none py-2 text-[11px] ${active(n.href) ? "text-accent" : "text-muted"}`}>
            <Icon d={n.icon} />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
