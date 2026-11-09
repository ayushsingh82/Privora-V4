import Link from "next/link";
import Logo from "./Logo";

/** Landing-page navbar: wordmark and one action. The app lives behind "Open app" with its own sidebar. */
export default function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 bg-black/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.22em]">
          <Logo size={26} />
          PRIVORA
        </Link>
        <Link href="/swap" className="bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200">Open app</Link>
      </div>
    </nav>
  );
}
