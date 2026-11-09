import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeAbiParameters, zeroAddress } from "viem";
import { COMMAND_V4_SWAP, CURATED, encodeExactInSingle, keyFor, poolId, routeFor } from "./v4.ts";
import { ETH, FEATURED_TOKENS } from "../tokenList.ts";

test("poolId matches the on-chain pool id for the GLD pool (verified against StateView on Robinhood testnet)", () => {
  // Pool 0xbdde859b… was returned by the PoolManager Initialize event for ETH/GLD fee 3000 ts 60 no hook.
  const id = poolId(keyFor(CURATED.find((c) => c.token.symbol === "GLD")!));
  assert.equal(id, "0xbdde859b5d88b50263215f1d9dc596a0c088fce68399dd01901cde90e9a27b94");
});

test("routeFor: ETH→token is zeroForOne, token→ETH is not, token→token is unsupported", () => {
  const gld = FEATURED_TOKENS.find((t) => t.symbol === "GLD")!, spy = FEATURED_TOKENS.find((t) => t.symbol === "SPY")!;
  assert.equal(routeFor(ETH, gld)?.zeroForOne, true);
  assert.equal(routeFor(gld, ETH)?.zeroForOne, false);
  assert.equal(routeFor(gld, spy), null);
});

test("encodeExactInSingle builds a V4_SWAP command with SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL", () => {
  const key = keyFor(CURATED.find((c) => c.token.symbol === "GLD")!);
  const { commands, inputs } = encodeExactInSingle({ key, zeroForOne: true, amountIn: 10n ** 15n, minOut: 5n * 10n ** 14n });
  assert.equal(commands, COMMAND_V4_SWAP);
  assert.equal(inputs.length, 1);
  const [actions, params] = decodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], inputs[0]);
  assert.equal(actions, "0x060c0f");
  assert.equal(params.length, 3);
  // SETTLE_ALL pays currency0 (native ETH = address(0)) up to amountIn; TAKE_ALL takes the token with minOut
  const [settleCur, settleMax] = decodeAbiParameters([{ type: "address" }, { type: "uint128" }], params[1]);
  assert.equal(settleCur, zeroAddress);
  assert.equal(settleMax, 10n ** 15n);
  const [takeCur, takeMin] = decodeAbiParameters([{ type: "address" }, { type: "uint128" }], params[2]);
  assert.equal(takeCur, key.currency1);
  assert.equal(takeMin, 5n * 10n ** 14n);
});
