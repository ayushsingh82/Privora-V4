/** Pink corner brackets for cards. The parent needs `relative`. */
const POS: Record<string, string> = {
  tl: "left-0 top-0 border-l-2 border-t-2",
  tr: "right-0 top-0 border-r-2 border-t-2",
  bl: "bottom-0 left-0 border-b-2 border-l-2",
  br: "bottom-0 right-0 border-b-2 border-r-2",
};
export default function Brackets({ corners = ["tl", "br"], size = 22 }: { corners?: string[]; size?: number }) {
  return <>{corners.map((c) => <span key={c} aria-hidden className={`pointer-events-none absolute border-accent ${POS[c]}`} style={{ width: size, height: size }} />)}</>;
}

/** Small uppercase section label in the accent colour. */
export function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold tracking-[0.2em] text-accent">{children}</p>;
}
