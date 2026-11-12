import { test } from "node:test";
import assert from "node:assert/strict";
import { zeroAddress } from "viem";
import { encodeDecrease, encodeMintFullRange, fullRange, liquidityForEth, liquidityShare, Q96 } from "./liquidity.ts";

test("full range ticks are symmetric multiples of the spacing", () => {
  for (const ts of [60, 200]) {
    const r = fullRange(ts);
    assert.equal(r.lower, -r.upper);
    assert.equal(r.upper % ts, 0);
    assert.ok(r.upper <= 887272);
  }
  assert.equal(fullRange(60).upper, 887220);
});

test("amounts match the price (1 ETH = 1,000,000 token)", () => {
  const r = liquidityForEth(10n ** 15n, 1000n * Q96);
  assert.ok(r.liquidity > 0n);
  assert.ok(r.token <= 1000n * 10n ** 18n && r.token > 990n * 10n ** 18n);
  assert.ok(r.ethUsed <= 10n ** 15n);
  assert.ok(r.amount1Max > r.token && r.amount0Max > 10n ** 15n);
});

test("encodes mint calldata", () => {
  const token = "0x36b31eb911039f449cef6e775f253fabad1db701";
  const data = encodeMintFullRange({ key: { currency0: zeroAddress, currency1: token, fee: 3000, tickSpacing: 60, hooks: zeroAddress }, liquidity: 1n, amount0Max: 2n, amount1Max: 3n, recipient: token });
  assert.ok(data.startsWith("0x") && data.length > 200);
});

test("liquidityShare rounds down and 100% is exact", () => {
  assert.equal(liquidityShare(1001n, 50), 500n);
  assert.equal(liquidityShare(1001n, 100), 1001n);
  assert.equal(liquidityShare(1001n, 0), 0n);
});

test("encodes decrease (with and without burn)", () => {
  const token = "0x36b31eb911039f449cef6e775f253fabad1db701";
  const key = { currency0: zeroAddress, currency1: token, fee: 3000, tickSpacing: 60, hooks: zeroAddress } as const;
  const part = encodeDecrease({ key, tokenId: 7n, liquidity: 5n, burn: false, recipient: token });
  const full = encodeDecrease({ key, tokenId: 7n, liquidity: 5n, burn: true, recipient: token });
  assert.ok(full.length > part.length);
});
