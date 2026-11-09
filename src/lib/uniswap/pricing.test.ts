import { test } from "node:test";
import assert from "node:assert/strict";
import { idealOut, minReceived, priceImpactBps, spotPrice } from "./pricing.ts";

const Q96 = 1n << 96n;

test("price 1:1 (sqrtPriceX96 = 2^96)", () => {
  assert.equal(idealOut(1000n, Q96, true), 1000n);
  assert.equal(idealOut(1000n, Q96, false), 1000n);
  assert.equal(spotPrice(Q96), 1);
});

test("price 4:1 (sqrtPrice = 2 * 2^96): token0 is worth 4 token1", () => {
  assert.equal(idealOut(1000n, 2n * Q96, true), 4000n);
  assert.equal(idealOut(4000n, 2n * Q96, false), 1000n);
});

test("price impact: zero when output equals spot minus fee, grows with worse output", () => {
  // 0.3% fee at 1:1: 1000 in -> 997 out is exactly spot-after-fee
  assert.equal(priceImpactBps(1000n, 997n, Q96, true, 3000), 0);
  assert.equal(priceImpactBps(1000n, 897n, Q96, true, 3000), 1003); // ~10% worse
  assert.equal(priceImpactBps(0n, 0n, Q96, true, 3000), 0);
});

test("minReceived applies slippage in bps", () => {
  assert.equal(minReceived(10000n, 50), 9950n);
  assert.equal(minReceived(10000n, 0), 10000n);
});
