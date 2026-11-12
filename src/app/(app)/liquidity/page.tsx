import Brackets, { Label } from "@/components/Brackets";
import LiquidityCard from "@/components/LiquidityCard";

export default function Liquidity() {
  return (
    <div className="space-y-6">
      <div>
        <Label>LIQUIDITY</Label>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Liquidity</h1>
        <p className="mt-1 text-sm text-muted">Provide full-range liquidity to the curated Uniswap v4 ETH pools, including the Guard-hooked tWIF pool.</p>
      </div>
      <LiquidityCard />
      <div className="relative max-w-xl bg-card p-6 text-sm text-muted">
        <Brackets corners={["tl", "br"]} />
        <p>v4 positions are NFTs minted by the PositionManager. This page mints one full-range position per deposit. Custom ranges and removing liquidity are not in this demo yet.</p>
      </div>
    </div>
  );
}
