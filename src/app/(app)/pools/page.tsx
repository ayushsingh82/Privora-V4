"use client";
import Brackets, { Label } from "@/components/Brackets";
import { useQuery } from "@tanstack/react-query";
import { CHAIN } from "@/lib/ethereum/chains";
import { fetchCuratedPools } from "@/lib/uniswap/pools";
import { useReadsReady } from "@/lib/hooks";
import { friendly, isPrivacyBlock } from "@/lib/errors";
import LiveReads from "@/components/LiveReads";
import PoolCard, { POOL_COLS } from "@/components/PoolCard";
import type { Pool } from "@/lib/uniswap/pools";

function PoolTable({ pools }: { pools: Pool[] }) {
  return (
    <div className="relative overflow-hidden bg-card">
      <Brackets corners={["tl", "br"]} />
      <div className={`hidden gap-x-6 border-b border-line px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-muted md:grid ${POOL_COLS}`}>
        <span>Pool</span><span>Price</span><span>Liquidity</span><span>Tick</span><span className="w-[7.5rem]" />
      </div>
      <div className="divide-y divide-line">{pools.map((p, i) => <PoolCard key={p.id} p={p} index={i % 6} />)}</div>
    </div>
  );
}

export default function Pools() {
  const { ready, mode } = useReadsReady();
  const pools = useQuery({ queryKey: ["curated-pools", mode, CHAIN.id], enabled: ready, queryFn: fetchCuratedPools });

  return (
    <div className="space-y-8">
      <div className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>POOLS</Label>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pools</h1>
          <p className="mt-1 text-sm text-muted">Uniswap v4 pools on {CHAIN.name}. State is read from the StateView contract through the active transport (Anon-RPC by default).</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-md border border-line bg-card px-3 py-1.5"><span className="text-muted">Pools </span><span className="mono font-semibold">{pools.data ? pools.data.length : "–"}</span></span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-muted">Featured ETH pools</h2>
        <p className="mb-3 text-xs text-muted">Anyone can create v4 pools here (tens of thousands exist), so this is a curated list of funded, hook-less ETH pools.</p>
        {(!ready || (pools.isFetching && !pools.data)) && <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>}
        {pools.isError && ready && (
          <div className="flex flex-wrap items-center gap-3">
            <p className={`text-sm ${isPrivacyBlock(pools.error) ? "text-muted" : "text-bad"}`}>{friendly(pools.error)}</p>
            <button onClick={() => pools.refetch()} className="rounded-md bg-card2 px-3 py-1.5 text-xs font-semibold hover:bg-line">Retry</button>
          </div>
        )}
        {pools.data && pools.data.length > 0 && <PoolTable pools={pools.data} />}
        {pools.data && pools.data.length === 0 && <p className="text-sm text-muted">No curated pools found on this network.</p>}
      </div>
      <aside className="lg:sticky lg:top-6">
        <LiveReads wide rows={10} />
        <p className="mt-2 text-xs text-muted">These are the calls that loaded the pools above: pool state is read from StateView, in one batched request, through the mixnet.</p>
      </aside>
      </div>
    </div>
  );
}
