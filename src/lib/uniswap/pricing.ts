// Pure v4 price math from sqrtPriceX96 (Q64.96). v4 fees are in hundredths of a bip (3000 = 0.30%).

const Q192 = 1n << 192n;

/** Output the swap would give at the pool's current spot price with NO fee and NO slippage. */
export function idealOut(amountIn: bigint, sqrtPriceX96: bigint, zeroForOne: boolean): bigint {
  if (amountIn <= 0n || sqrtPriceX96 <= 0n) return 0n;
  const p = sqrtPriceX96 * sqrtPriceX96; // token1 per token0, Q192
  return zeroForOne ? (amountIn * p) / Q192 : (amountIn * Q192) / p;
}

/** Price impact in bps vs. spot, with the LP fee taken out first (so a tiny trade shows ≈0%). */
export function priceImpactBps(amountIn: bigint, amountOut: bigint, sqrtPriceX96: bigint, zeroForOne: boolean, fee: number): number {
  const ideal = idealOut(amountIn, sqrtPriceX96, zeroForOne);
  if (ideal <= 0n) return 0;
  const afterFee = (ideal * BigInt(1_000_000 - fee)) / 1_000_000n;
  if (afterFee <= 0n) return 0;
  const bps = ((afterFee - amountOut) * 10000n) / afterFee;
  return Math.max(0, Number(bps));
}

export function minReceived(amountOut: bigint, slippageBps: number): bigint {
  return (amountOut * BigInt(10000 - slippageBps)) / 10000n;
}

/** token1 per token0 as a JS number (display only). */
export function spotPrice(sqrtPriceX96: bigint): number {
  const s = Number(sqrtPriceX96) / 2 ** 96;
  return s * s;
}
