// Full-range liquidity for ETH / token v4 pools via the PositionManager (MINT_POSITION + SETTLE_PAIR + SWEEP).
// Pure helpers, unit-tested in liquidity.test.ts.
import { encodeAbiParameters, encodePacked, parseAbiItem, zeroAddress, type Address, type Hex } from "viem";
import type { PoolKey } from "./v4";

export const Q96 = 2n ** 96n;
const MAX_TICK = 887272;
export const ACTION_DECREASE_LIQUIDITY = 0x01, ACTION_MINT_POSITION = 0x02, ACTION_BURN_POSITION = 0x03, ACTION_SETTLE_PAIR = 0x0d, ACTION_TAKE_PAIR = 0x11, ACTION_SWEEP = 0x14;

const KEY_T = { type: "tuple", components: [{ name: "currency0", type: "address" }, { name: "currency1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" }] } as const;

export const positionManagerAbi = [
  { type: "function", name: "modifyLiquidities", stateMutability: "payable", inputs: [{ name: "unlockData", type: "bytes" }, { name: "deadline", type: "uint256" }], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "getPositionLiquidity", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint128" }] },
  { type: "function", name: "getPoolAndPositionInfo", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ ...KEY_T, name: "poolKey" }, { name: "info", type: "uint256" }] },
] as const;

export const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed id)");


/** Widest usable tick range for a tick spacing (multiples of the spacing). */
export function fullRange(tickSpacing: number): { lower: number; upper: number } {
  const t = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
  return { lower: -t, upper: t };
}

/**
 * Liquidity and token amounts for a full-range deposit of `ethIn` wei at the current price.
 * Full range ≈ amount0 = L·2^96/√P and amount1 = L·√P/2^96, so L = amount0·√P/2^96. L is rounded down 0.1% so the
 * required token amount never exceeds what we computed; maxes add the slippage buffer (leftover ETH is swept back).
 */
export function liquidityForEth(ethIn: bigint, sqrtPriceX96: bigint, bufferBps = 500n) {
  const liquidity = (((ethIn * sqrtPriceX96) / Q96) * 999n) / 1000n;
  const token = (liquidity * sqrtPriceX96) / Q96 + 1n;
  const ethUsed = (liquidity * Q96) / sqrtPriceX96 + 1n;
  return { liquidity, token, ethUsed, amount0Max: (ethIn * (10000n + bufferBps)) / 10000n, amount1Max: (token * (10000n + bufferBps)) / 10000n };
}

export function encodeMintFullRange(args: { key: PoolKey; liquidity: bigint; amount0Max: bigint; amount1Max: bigint; recipient: Address }): Hex {
  const { lower, upper } = fullRange(args.key.tickSpacing);
  const actions = encodePacked(["uint8", "uint8", "uint8"], [ACTION_MINT_POSITION, ACTION_SETTLE_PAIR, ACTION_SWEEP]);
  const params = [
    encodeAbiParameters([KEY_T, { type: "int24" }, { type: "int24" }, { type: "uint256" }, { type: "uint128" }, { type: "uint128" }, { type: "address" }, { type: "bytes" }],
      [args.key, lower, upper, args.liquidity, args.amount0Max, args.amount1Max, args.recipient, "0x"]),
    encodeAbiParameters([{ type: "address" }, { type: "address" }], [args.key.currency0, args.key.currency1]),
    encodeAbiParameters([{ type: "address" }, { type: "address" }], [zeroAddress, args.recipient]),
  ];
  return encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, params]);
}

/** Liquidity to remove for a percentage (1 to 100) of a position. */
export const liquidityShare = (total: bigint, pct: number) => (pct >= 100 ? total : (total * BigInt(Math.max(0, Math.floor(pct)))) / 100n);

/**
 * Remove liquidity: DECREASE_LIQUIDITY (+ BURN_POSITION when removing everything) then TAKE_PAIR to the recipient.
 * Mins are 0 here; the caller protects the user by simulating first and by the pool's own price (see UI note).
 */
export function encodeDecrease(args: { key: PoolKey; tokenId: bigint; liquidity: bigint; burn: boolean; recipient: Address; amount0Min?: bigint; amount1Min?: bigint }): Hex {
  const a0 = args.amount0Min ?? 0n, a1 = args.amount1Min ?? 0n;
  const acts = args.burn ? [ACTION_DECREASE_LIQUIDITY, ACTION_BURN_POSITION, ACTION_TAKE_PAIR] : [ACTION_DECREASE_LIQUIDITY, ACTION_TAKE_PAIR];
  const actions = encodePacked(acts.map(() => "uint8" as const), acts);
  const params: Hex[] = [encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }, { type: "uint128" }, { type: "uint128" }, { type: "bytes" }], [args.tokenId, args.liquidity, a0, a1, "0x"])];
  if (args.burn) params.push(encodeAbiParameters([{ type: "uint256" }, { type: "uint128" }, { type: "uint128" }, { type: "bytes" }], [args.tokenId, a0, a1, "0x"]));
  params.push(encodeAbiParameters([{ type: "address" }, { type: "address" }, { type: "address" }], [args.key.currency0, args.key.currency1, args.recipient]));
  return encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, params]);
}
