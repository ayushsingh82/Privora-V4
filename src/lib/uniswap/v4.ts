// Uniswap v4 pure helpers: pool keys/ids, curated pools, Universal Router calldata. No network access here (unit-testable).
import { encodeAbiParameters, encodePacked, keccak256, zeroAddress, type Address, type Hex } from "viem";
import { FEATURED_POOLS, ETH, type Token } from "../tokenList.ts";

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

const POOL_KEY_PARAMS = [
  {
    type: "tuple",
    components: [
      { name: "currency0", type: "address" },
      { name: "currency1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickSpacing", type: "int24" },
      { name: "hooks", type: "address" },
    ],
  },
] as const;

/** PoolId = keccak256(abi.encode(PoolKey)) */
export function poolId(key: PoolKey): Hex {
  return keccak256(encodeAbiParameters(POOL_KEY_PARAMS, [key]));
}

/** Curated pools: native ETH (currency0 = address(0)) vs a token, no hook, funded on testnet. */
export interface CuratedPool {
  token: Token;
  fee: number;
  tickSpacing: number;
}
export const CURATED: CuratedPool[] = FEATURED_POOLS;

export function keyFor(c: CuratedPool): PoolKey {
  return { currency0: zeroAddress, currency1: c.token.address, fee: c.fee, tickSpacing: c.tickSpacing, hooks: zeroAddress };
}

/** The ETH pool for a (from,to) pair, with swap direction. Native ETH is currency0, so ETH → token is zeroForOne. */
export function routeFor(from: Token, to: Token): { pool: CuratedPool; zeroForOne: boolean } | null {
  if (from.native && !to.native) {
    const pool = CURATED.find((c) => c.token.address.toLowerCase() === to.address.toLowerCase());
    return pool ? { pool, zeroForOne: true } : null;
  }
  if (!from.native && to.native) {
    const pool = CURATED.find((c) => c.token.address.toLowerCase() === from.address.toLowerCase());
    return pool ? { pool, zeroForOne: false } : null;
  }
  return null; // token ↔ token (multi-hop) is not in v1
}

// ---- Universal Router encoding (v4-periphery Actions + universal-router Commands) ----
export const COMMAND_V4_SWAP = "0x10" as const;
export const ACTION_SWAP_EXACT_IN_SINGLE = 0x06;
export const ACTION_SETTLE_ALL = 0x0c;
export const ACTION_TAKE_ALL = 0x0f;

/** Builds the (commands, inputs) pair for an exact-input single-pool swap on Universal Router. */
export function encodeExactInSingle(args: {
  key: PoolKey;
  zeroForOne: boolean;
  amountIn: bigint;
  minOut: bigint;
}): { commands: Hex; inputs: Hex[] } {
  const { key, zeroForOne, amountIn, minOut } = args;
  const actions = encodePacked(["uint8", "uint8", "uint8"], [ACTION_SWAP_EXACT_IN_SINGLE, ACTION_SETTLE_ALL, ACTION_TAKE_ALL]);
  const currencyIn = zeroForOne ? key.currency0 : key.currency1;
  const currencyOut = zeroForOne ? key.currency1 : key.currency0;
  const swapParams = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "poolKey", type: "tuple", components: POOL_KEY_PARAMS[0].components },
          { name: "zeroForOne", type: "bool" },
          { name: "amountIn", type: "uint128" },
          { name: "amountOutMinimum", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    [{ poolKey: key, zeroForOne, amountIn, amountOutMinimum: minOut, hookData: "0x" }],
  );
  const settle = encodeAbiParameters([{ type: "address" }, { type: "uint128" }], [currencyIn, amountIn]);
  const take = encodeAbiParameters([{ type: "address" }, { type: "uint128" }], [currencyOut, minOut]);
  const input = encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, [swapParams, settle, take]]);
  return { commands: COMMAND_V4_SWAP, inputs: [input] };
}

export { ETH };
