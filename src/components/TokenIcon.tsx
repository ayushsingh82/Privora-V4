"use client";
// Token badges. Well-known tokens use their real logo, bundled in /public/tokens (served from this app's own origin:
// a third-party logo CDN would see every visitor's IP, which is exactly what Privora exists to avoid). Any other token
// gets a unique identicon generated from its address, so two different tokens never look alike.
import { useId, useState } from "react";

const LOGOS: Record<string, string> = {
  ETH: "eth", WETH: "eth", USDC: "usdc", USDT: "usdt", DAI: "dai", WBTC: "wbtc", UNI: "uni", LINK: "link",
};

const BRAND: Record<string, { bg: string; glyph: string }> = {
  USDC: { bg: "#2775ca", glyph: "$" },
  USDT: { bg: "#26a17b", glyph: "₮" },
  DAI: { bg: "#f5ac37", glyph: "◈" },
  WBTC: { bg: "#f7931a", glyph: "₿" },
};
const PALETTE = ["#7c5cff", "#2bb3a3", "#e8833a", "#4f8cff", "#d1558a", "#6bbf59", "#c9a227", "#8a6cf0"];

function hash(str: string) {
  let h = 2166136261 >>> 0;
  for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

export default function TokenIcon({ symbol, address = "", size = 28 }: { symbol: string; address?: string; size?: number }) {
  const id = useId();
  const [broken, setBroken] = useState(false);
  const s = symbol.toUpperCase();
  const logo = LOGOS[s];
  if (logo && !broken) {
    return <img src={`/tokens/${logo}.png`} alt="" width={size} height={size} onError={() => setBroken(true)} className="shrink-0 rounded-full bg-card2 object-cover" style={{ width: size, height: size }} />;
  }
  const eth = s === "ETH" || s === "WETH";
  const brand = BRAND[s];
  if (eth) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <circle cx="16" cy="16" r="16" fill="#627eea" />
        <g fill="#fff"><path d="M16 5.5 9.2 16.2 16 12.4z" opacity=".65" /><path d="M16 5.5v6.9l6.8 3.8z" /><path d="M16 20.1 9.2 17.1 16 26.5z" opacity=".65" /><path d="M16 20.1v6.4l6.8-9.4z" /></g>
      </svg>
    );
  }
  if (brand) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <circle cx="16" cy="16" r="16" fill={brand.bg} />
        <circle cx="16" cy="16" r="11.5" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
        <text x="16" y="21.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="ui-sans-serif, system-ui, sans-serif">{brand.glyph}</text>
      </svg>
    );
  }
  // identicon: 5x5 grid, left half derived from the hash and mirrored, on a coloured disc
  const h1 = hash((address || symbol).toLowerCase());
  const h2 = hash(`${h1}:${address || symbol}`);
  const bits = (h1 ^ (h2 << 3)) >>> 0;
  const color = PALETTE[h1 % PALETTE.length];
  const cells: [number, number][] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
    if ((bits >> (r * 3 + c)) & 1 || (r === 2 && c === 2)) { cells.push([c, r]); if (c < 2) cells.push([4 - c, r]); }
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <defs><clipPath id={id}><circle cx="16" cy="16" r="16" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect width="32" height="32" fill={color} />
        {cells.map(([c, r]) => <rect key={`${c}-${r}`} x={4 + c * 4.8} y={4 + r * 4.8} width="4.8" height="4.8" fill="#fff" fillOpacity=".88" />)}
      </g>
    </svg>
  );
}

/** Two overlapping badges, for pool pairs. */
export function PairIcons({ a, b, size = 34 }: { a: { symbol: string; address: string }; b: { symbol: string; address: string }; size?: number }) {
  return (
    <span className="flex shrink-0 items-center">
      <span className="rounded-full ring-2 ring-card"><TokenIcon symbol={a.symbol} address={a.address} size={size} /></span>
      <span className="-ml-2.5 rounded-full ring-2 ring-card"><TokenIcon symbol={b.symbol} address={b.address} size={size} /></span>
    </span>
  );
}
