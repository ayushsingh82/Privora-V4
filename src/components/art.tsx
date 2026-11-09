// Landing-page illustrations. Inline SVG with SMIL animation: no assets, no libraries, theme colours.
const BAD = "#fd4040";
const ACC = "#ccff00";
const OK = "#27ae60";
const T = { fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif" } as const;
const M = { fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, monospace" } as const;

/** A request chip that travels along a path. */
function Packet({ path, dur, begin = "0s", children }: { path: string; dur: string; begin?: string; children: React.ReactNode }) {
  return (
    <g>
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={path} calcMode="linear" />
      {children}
    </g>
  );
}

/**
 * Hero: the same request, twice. Top: a normal dapp, the request carries who you are straight to the provider.
 * Bottom: Privora, the identity is stripped at the shield, the request is re-wrapped and mixed, and arrives anonymous.
 */
export function HeroAnimation({ className = "" }: { className?: string }) {
  const D = "8s";
  const mixCols = [296, 396, 496];
  const mixRows = [262, 330, 398];
  // zig-zag route through the mixnet (shield -> node -> node -> node -> provider)
  const route = "M124 330 L196 330 L296 262 L396 398 L496 330 L618 330";
  return (
    <svg viewBox="0 0 760 460" className={className} role="img" aria-label="A normal dapp sends your identity to the RPC provider. Privora strips it at a shield and sends the request through a mixnet, so the provider sees an anonymous exit.">
      {/* lane titles */}
      <text x="24" y="52" fontSize="13" letterSpacing="1.5" className="fill-muted" style={T}>A NORMAL DAPP</text>
      <text x="24" y="232" fontSize="13" letterSpacing="1.5" fill={ACC} style={T}>PRIVORA</text>

      {/* ===== top lane ===== */}
      <g>
        <rect x="24" y="84" width="100" height="72" className="fill-card2 stroke-line" strokeWidth="2" />
        {[40, 52, 64].map((x) => <circle key={x} cx={x} cy="96" r="2.6" className="fill-muted" opacity=".6" />)}
        <rect x="38" y="112" width="72" height="8" className="fill-line" />
        <rect x="38" y="128" width="46" height="8" className="fill-line" opacity=".6" />
        <text x="74" y="178" textAnchor="middle" fontSize="12" className="fill-muted" style={T}>You</text>

        <line x1="124" y1="120" x2="618" y2="120" className="stroke-line" strokeWidth="2" strokeDasharray="4 8" />
        <Packet path="M124 120 L618 120" dur="4.6s">
          <rect x="-7" y="-7" width="14" height="14" fill={BAD} />
          <g transform="translate(-48,-34)">
            <rect width="104" height="22" fill={BAD} opacity=".18" stroke={BAD} strokeWidth="1.2" />
            <text x="52" y="15" textAnchor="middle" fontSize="11" fontWeight="600" fill={BAD} style={T}>IP + your wallet</text>
          </g>
        </Packet>

        <rect x="618" y="84" width="118" height="72" className="fill-card2" stroke={BAD} strokeWidth="2">
          <animate attributeName="stroke-opacity" values=".35;.35;1;.35" keyTimes="0;.78;.9;1" dur="4.6s" repeatCount="indefinite" />
        </rect>
        {[100, 114, 128].map((y) => <rect key={y} x="632" y={y} width="48" height="6" className="fill-line" />)}
        <g transform="translate(704,120)">
          <path d="M-14 0c4-8 9-12 14-12s10 4 14 12c-4 8-9 12-14 12s-10-4-14-12z" fill="none" stroke={BAD} strokeWidth="2" strokeLinejoin="round" />
          <circle r="4" fill={BAD}>
            <animate attributeName="r" values="3;3;6;3" keyTimes="0;.78;.9;1" dur="4.6s" repeatCount="indefinite" />
          </circle>
        </g>
        <text x="677" y="178" textAnchor="middle" fontSize="12" className="fill-muted" style={T}>RPC provider</text>
        <text x="677" y="196" textAnchor="middle" fontSize="12" fontWeight="600" fill={BAD} style={T}>sees who you are</text>
      </g>

      {/* ===== bottom lane ===== */}
      <g>
        <rect x="24" y="294" width="100" height="72" className="fill-card2 stroke-line" strokeWidth="2" />
        {[40, 52, 64].map((x) => <circle key={x} cx={x} cy="306" r="2.6" className="fill-muted" opacity=".6" />)}
        <rect x="38" y="322" width="72" height="8" className="fill-line" />
        <rect x="38" y="338" width="46" height="8" className="fill-line" opacity=".6" />
        <text x="74" y="388" textAnchor="middle" fontSize="12" className="fill-muted" style={T}>You</text>

        {/* mixnet mesh */}
        {mixCols.slice(0, -1).flatMap((x, ci) => mixRows.flatMap((y1) => mixRows.map((y2) => (
          <line key={`${ci}-${y1}-${y2}`} x1={x} y1={y1} x2={mixCols[ci + 1]} y2={y2} className="stroke-line" strokeWidth="1" opacity=".55" />
        ))))}
        {mixRows.map((y) => <line key={`in${y}`} x1="196" y1="330" x2="296" y2={y} className="stroke-line" strokeWidth="1" opacity=".55" />)}
        {mixRows.map((y) => <line key={`out${y}`} x1="496" y1={y} x2="618" y2="330" className="stroke-line" strokeWidth="1" opacity=".55" />)}
        <line x1="124" y1="330" x2="196" y2="330" stroke={ACC} strokeWidth="2" strokeDasharray="4 8" className="line-flow" />
        {mixCols.flatMap((x, ci) => mixRows.map((y, ri) => (
          <g key={`${x}-${y}`} transform={`translate(${x},${y})`}>
            <rect x="-8" y="-8" width="16" height="16" transform="rotate(45)" className="fill-card2" stroke={ACC} strokeWidth="1.6" strokeOpacity=".7" />
            <circle r="2.6" fill={ACC} className="net-node" style={{ animationDelay: `${(ci * 3 + ri) * 0.35}s` }} />
          </g>
        )))}

        {/* the shield: where identity is stripped */}
        <g transform="translate(196,330)">
          <path d="M0 -40 30 -28v24c0 22-13 36-30 44-17-8-30-22-30-44v-24z" fill={ACC} fillOpacity=".16" stroke={ACC} strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M-11 0l8 8 15-17" fill="none" stroke={ACC} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <text x="196" y="402" textAnchor="middle" fontSize="12" fontWeight="600" fill={ACC} style={T}>Anon-RPC</text>

        {/* the request: layered like an onion, peeled at each mix node */}
        <Packet path={route} dur={D}>
          <rect x="-13" y="-13" width="26" height="26" fill="none" stroke={ACC} strokeWidth="1.5">
            <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.34;.35;1" dur={D} repeatCount="indefinite" />
          </rect>
          <rect x="-10" y="-10" width="20" height="20" fill="none" stroke={ACC} strokeWidth="1.5">
            <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.6;.61;1" dur={D} repeatCount="indefinite" />
          </rect>
          <rect x="-7" y="-7" width="14" height="14" fill={ACC} />
          <g transform="translate(-52,-38)">
            <g>
              <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.15;.17;1" dur={D} repeatCount="indefinite" />
              <rect width="104" height="22" fill={BAD} opacity=".18" stroke={BAD} strokeWidth="1.2" />
              <text x="52" y="15" textAnchor="middle" fontSize="11" fontWeight="600" fill={BAD} style={T}>IP + your wallet</text>
            </g>
            <g opacity="0">
              <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;.16;.19;1" dur={D} repeatCount="indefinite" />
              <rect width="104" height="22" fill={OK} opacity=".18" stroke={OK} strokeWidth="1.2" />
              <text x="52" y="15" textAnchor="middle" fontSize="11" fontWeight="600" fill={OK} style={T}>anonymous</text>
            </g>
          </g>
        </Packet>

        <rect x="618" y="294" width="118" height="72" className="fill-card2" stroke={OK} strokeWidth="2">
          <animate attributeName="stroke-opacity" values=".35;.35;1;.35" keyTimes="0;.86;.95;1" dur={D} repeatCount="indefinite" />
        </rect>
        {[310, 324, 338].map((y) => <rect key={y} x="632" y={y} width="48" height="6" className="fill-line" />)}
        <g transform="translate(704,330)">
          <path d="M-14 0c4-8 9-12 14-12s10 4 14 12c-4 8-9 12-14 12s-10-4-14-12z" fill="none" stroke={OK} strokeWidth="2" strokeLinejoin="round" />
          <path d="M-12 12 12 -12" stroke={OK} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <text x="677" y="388" textAnchor="middle" fontSize="12" className="fill-muted" style={T}>RPC provider</text>
        <text x="677" y="406" textAnchor="middle" fontSize="12" fontWeight="600" fill={OK} style={T}>sees a mixnet exit</text>
      </g>
    </svg>
  );
}

const card = "fill-card2 stroke-line";

/** Step 1: reads enter the shield and fan out through the mixnet. */
export function StepReadArt() {
  const ys = [50, 80, 110];
  return (
    <svg viewBox="0 0 280 160" className="h-auto w-full" role="img" aria-label="Reads enter Anon-RPC and fan out through a mixnet">
      <rect x="6" y="56" width="42" height="48" className={card} strokeWidth="2" />
      <rect x="14" y="70" width="26" height="6" className="fill-line" /><rect x="14" y="82" width="16" height="6" className="fill-line" opacity=".6" />
      <g transform="translate(96,80)">
        <path d="M0 -34 24 -24v20c0 18-10 30-24 36-14-6-24-18-24-36v-20z" fill={ACC} fillOpacity=".16" stroke={ACC} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M-9 0l7 7 12-14" fill="none" stroke={ACC} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <line x1="48" y1="80" x2="72" y2="80" stroke={ACC} strokeWidth="2" strokeDasharray="3 6" className="line-flow" />
      {ys.map((y, i) => (
        <g key={y}>
          <line x1="120" y1="80" x2="200" y2={y} className="stroke-line" strokeWidth="1.4" />
          <line x1="200" y1={y} x2="244" y2="80" className="stroke-line" strokeWidth="1.4" />
          <rect x="194" y={y - 6} width="12" height="12" transform={`rotate(45 200 ${y})`} className="fill-card2" stroke={ACC} strokeWidth="1.5" />
          <circle cx="200" cy={y} r="2.4" fill={ACC} className="net-node" style={{ animationDelay: `${i * 0.5}s` }} />
          <rect x="-4" y="-4" width="8" height="8" fill={ACC}>
            <animateMotion dur="3.6s" begin={`${i * 1.2}s`} repeatCount="indefinite" path={`M48 80 L120 80 L200 ${y} L244 80`} />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.08;.9;1" dur="3.6s" begin={`${i * 1.2}s`} repeatCount="indefinite" />
          </rect>
        </g>
      ))}
      <rect x="232" y="56" width="42" height="48" className={card} strokeWidth="2" />
      {[66, 78, 90].map((y) => <rect key={y} x="240" y={y} width="26" height="5" className="fill-line" />)}
      <text x="140" y="150" textAnchor="middle" fontSize="11" className="fill-muted" style={T}>anonymous exit</text>
    </svg>
  );
}

/** Step 2: the wallet signs; a signature is drawn, then confirmed. */
export function StepWalletArt() {
  return (
    <svg viewBox="0 0 280 160" className="h-auto w-full" role="img" aria-label="A wallet signs a transaction">
      <rect x="40" y="14" width="200" height="132" className={card} strokeWidth="2" />
      <rect x="40" y="14" width="200" height="30" className="fill-card" />
      <circle cx="58" cy="29" r="8" fill={ACC} opacity=".25" />
      <text x="74" y="33" fontSize="12" fontWeight="600" className="fill-fg" style={T}>Confirm swap</text>
      <text x="228" y="33" textAnchor="end" fontSize="10" className="fill-muted" style={T}>Your wallet</text>
      {[["You pay", 62], ["Approval", 82]].map(([l, y]) => (
        <g key={l as string}>
          <text x="56" y={y as number} fontSize="11" className="fill-muted" style={T}>{l}</text>
          <rect x="150" y={(y as number) - 9} width={l === "Approval" ? 74 : 62} height="11" className="fill-line" />
        </g>
      ))}
      <text x="224" y="92" textAnchor="end" fontSize="10" fontWeight="700" fill={OK} style={T}>exact amount</text>
      <path d="M58 122c10-22 14 8 24-4s10-14 16-6 8 10 16 0 12-8 18 0" fill="none" stroke={ACC} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="190" strokeDashoffset="190">
        <animate attributeName="stroke-dashoffset" values="190;0;0;190" keyTimes="0;.45;.9;1" dur="4.4s" repeatCount="indefinite" />
      </path>
      <g transform="translate(206,120)" opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.45;.55;.9;1" dur="4.4s" repeatCount="indefinite" />
        <circle r="13" fill={OK} fillOpacity=".2" /><path d="M-6 0l4 4 8-9" fill="none" stroke={OK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Step 3: private reads climb, direct reads stay at zero. */
export function StepVerifyArt() {
  const bars = [16, 28, 22, 38, 32, 48, 42, 56];
  return (
    <svg viewBox="0 0 280 160" className="h-auto w-full" role="img" aria-label="Private reads counter rising while direct reads stay at zero">
      <rect x="6" y="10" width="170" height="140" className={card} strokeWidth="2" />
      <text x="20" y="32" fontSize="10" letterSpacing="1.2" className="fill-muted" style={T}>PRIVATE READS</text>
      {bars.map((h, i) => (
        <rect key={i} x={22 + i * 18} y={138 - h} width="11" height={h} fill={ACC} opacity={0.35 + i * 0.09}>
          <animate attributeName="height" values={`${h * 0.35};${h};${h}`} keyTimes="0;.5;1" dur="3.2s" begin={`${i * 0.12}s`} repeatCount="indefinite" />
          <animate attributeName="y" values={`${138 - h * 0.35};${138 - h};${138 - h}`} keyTimes="0;.5;1" dur="3.2s" begin={`${i * 0.12}s`} repeatCount="indefinite" />
        </rect>
      ))}
      <text x="20" y="64" fontSize="22" fontWeight="700" fill={OK} style={M}>128</text>
      <rect x="186" y="10" width="88" height="140" className={card} strokeWidth="2" />
      <text x="198" y="32" fontSize="10" letterSpacing="1.2" className="fill-muted" style={T}>DIRECT</text>
      <text x="198" y="92" fontSize="40" fontWeight="700" className="fill-fg" style={M}>0</text>
      <circle cx="210" cy="122" r="11" fill={OK} fillOpacity=".2">
        <animate attributeName="r" values="10;14;10" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <path d="M204 122l4 4 8-9" fill="none" stroke={OK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="228" y="126" fontSize="11" fill={OK} style={T}>none</text>
    </svg>
  );
}
