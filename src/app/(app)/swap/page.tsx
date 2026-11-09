import { Label } from "@/components/Brackets";
import SwapCard from "@/components/swap/SwapCard";
import LiveReads from "@/components/LiveReads";
import Readiness from "@/components/swap/Readiness";

export default function SwapPage() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="fade-up text-center">
        <Label>SWAP</Label>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Swap</h1>
        <p className="mt-1 text-sm text-muted">Uniswap v4 on Robinhood Chain. Reads go through Anon-RPC; your wallet signs the transaction.</p>
      </div>
      <div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div style={{ ["--d" as string]: "100ms" }} className="fade-up flex w-full flex-col items-center gap-4 lg:w-auto"><Readiness /><SwapCard /></div>
        <div style={{ ["--d" as string]: "220ms" }} className="fade-up flex w-full justify-center lg:w-auto lg:flex-1 lg:max-w-md"><LiveReads /></div>
      </div>
    </div>
  );
}
