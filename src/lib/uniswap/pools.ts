// v4 pool state. Everything goes through readClient (so through the active privacy transport), batched with Multicall3:
// important on a mixnet where each request is slow.
import { type Hex } from "viem";
import { readClient } from "../ethereum/read-client";
import { CHAIN } from "../ethereum/chains";
import { stateViewAbi } from "./abis";
import { CURATED, keyFor, poolId, type PoolKey } from "./v4";
import { ETH, type Token } from "../tokens";

export interface Pool {
  id: Hex;
  key: PoolKey;
  token0: Token; // native ETH
  token1: Token;
  fee: number;
  tickSpacing: number;
  liquidity: bigint;
  sqrtPriceX96: bigint;
  tick: number;
}

/** State of every curated pool in ONE multicall request (2 calls per pool). */
export async function fetchCuratedPools(): Promise<Pool[]> {
  const keys = CURATED.map((c) => ({ c, key: keyFor(c), id: poolId(keyFor(c)) }));
  const r = await readClient.multicall({
    multicallAddress: CHAIN.multicall3,
    allowFailure: true,
    contracts: keys.flatMap(({ id }) => [
      { address: CHAIN.stateView, abi: stateViewAbi, functionName: "getSlot0", args: [id] } as const,
      { address: CHAIN.stateView, abi: stateViewAbi, functionName: "getLiquidity", args: [id] } as const,
    ]),
  });
  return keys.flatMap(({ c, key, id }, i) => {
    const s = r[i * 2], l = r[i * 2 + 1];
    if (s.status !== "success" || l.status !== "success") return [];
    const slot0 = s.result as readonly [bigint, number, number, number];
    return [{ id, key, token0: ETH, token1: c.token, fee: c.fee, tickSpacing: c.tickSpacing, liquidity: l.result as bigint, sqrtPriceX96: slot0[0], tick: slot0[1] }];
  });
}
