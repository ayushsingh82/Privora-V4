import { test } from "node:test";
import assert from "node:assert/strict";
import { zeroAddress } from "viem";
import { encodeMintFullRange, fullRange, liquidityForEth, Q96 } from "./liquidity.ts";

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
