import Brackets, { Label } from "@/components/Brackets";

export default function Liquidity() {
  return (
    <div className="space-y-6">
      <div>
        <Label>LIQUIDITY</Label>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Liquidity</h1>
        <p className="mt-1 text-sm text-muted">Providing liquidity on Uniswap v4 is not in this demo yet.</p>
      </div>
      <div className="relative max-w-xl bg-card p-6 text-sm text-muted">
        <Brackets corners={["tl", "br"]} />
        <p>v4 liquidity positions are NFTs minted by the PositionManager and are placed in tick ranges, so they need a different interface from V2 pools. Swaps and pool reads, the parts that benefit from anonymous reads, are live.</p>
      </div>
    </div>
  );
}
