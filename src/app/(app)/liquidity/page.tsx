import Brackets, { Label } from "@/components/Brackets";
import LiquidityCard from "@/components/LiquidityCard";

export default function Liquidity() {
  return (
    <div className="space-y-6">
      <div>
        <Label>LIQUIDITY</Label>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Liquidity</h1>
        <p className="mt-1 text-sm text-muted">Add or remove full-range liquidity on the curated Uniswap v4 ETH pools, including the Guard-hooked tWIF pool.</p>
      </div>
      <LiquidityCard />
      <div className="relative max-w-xl bg-card p-6 text-sm text-muted">
        <Brackets corners={["tl", "br"]} />
        <p>v4 positions are NFTs minted by the PositionManager. This page mints one full-range position per deposit and lists your positions so you can remove 25%, 50%, 75% or all of each. Custom ranges are not in this demo.</p>
      </div>
    </div>
  );
}
