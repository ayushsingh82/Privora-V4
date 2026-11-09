import Link from "next/link";
import Logo from "./Logo";

const GH = "https://github.com/ayushsingh82/Privora";

export default function Footer() {
  const col = "text-sm text-neutral-400 transition-colors hover:text-white";
  return (
    <footer className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <p className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.22em]"><Logo size={20} />PRIVORA</p>
            <p className="mt-3 max-w-sm text-sm text-neutral-500">Trade on Uniswap without telling an RPC provider who you are. Every lookup goes through Anon-RPC.</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500">PRODUCT</p>
            <ul className="mt-4 space-y-2">
              <li><a href="/#how" className={col}>How it works</a></li>
              <li><a href="/#flow" className={col}>The flow</a></li>
              <li><Link href="/swap" className={col}>Open app</Link></li>
              <li><Link href="/privacy" className={col}>Privacy page</Link></li>
              <li><Link href="/pitch" className={col}>Pitch</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500">RESOURCES</p>
            <ul className="mt-4 space-y-2">
              <li><a href={GH} target="_blank" rel="noreferrer" className={col}>GitHub</a></li>
              <li><a href={`${GH}/blob/main/docs/ANON_RPC_INTEGRATION.md`} target="_blank" rel="noreferrer" className={col}>Anon-RPC integration</a></li>
              <li><a href={`${GH}/blob/main/docs/TEST_REPORT.md`} target="_blank" rel="noreferrer" className={col}>Test report</a></li>
              <li><a href="/#architecture" className={col}>Architecture</a></li>
            </ul>
          </div>
        </div>
        <p aria-hidden className="mt-14 select-none text-center font-bold leading-none tracking-tighter text-accent text-[clamp(72px,19vw,260px)]">Privora</p>
        <div className="mt-8 flex flex-col gap-2 pt-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Privora · built for the World is Flat hackathon on Robinhood Chain</span>
          <span>Built on Uniswap v4 and Anon-RPC</span>
        </div>
      </div>
    </footer>
  );
}
