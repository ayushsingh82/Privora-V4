"use client";
import { useEffect, useRef, useState } from "react";
import Brackets from "./Brackets";

const ROWS = [
  ["Network", "IP address and rough location"],
  ["Wallet", "0xAb…c3, the one you control"],
  ["Watching", "USDC, LINK, UNI and two new tokens"],
  ["Habits", "Checks in most weekdays around 9am"],
];

/** An illustrative profile that fills in row by row as it scrolls into view: what one RPC provider can assemble. */
export default function ProfileBuild() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!ref.current || !("IntersectionObserver" in window)) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative bg-[#151515] p-7 sm:p-8">
      <Brackets corners={["tl", "br"]} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center border border-white/10 bg-black text-bad">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></svg>
          </span>
          <div>
            <div className="font-medium">A profile of you</div>
            <div className="text-xs text-neutral-500">Built from lookups alone. Illustrative.</div>
          </div>
        </div>
        <span className={`text-xs font-semibold tracking-[0.15em] text-bad transition-opacity duration-700 ${on ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "2.1s" }}>COMPLETE</span>
      </div>
      <dl className="mt-7 space-y-4">
        {ROWS.map(([k, v], i) => (
          <div key={k} className="grid grid-cols-[5.5rem_1fr] items-center gap-4 text-sm">
            <dt className="text-neutral-500">{k}</dt>
            <dd className="relative h-9 overflow-hidden bg-black">
              <span className="absolute inset-y-0 left-0 bg-bad/15 transition-[width] duration-700 ease-out" style={{ width: on ? "100%" : "0%", transitionDelay: `${0.25 + i * 0.5}s` }} />
              <span className={`absolute inset-0 flex items-center px-3 transition-opacity duration-500 ${on ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${0.55 + i * 0.5}s` }}>{v}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
