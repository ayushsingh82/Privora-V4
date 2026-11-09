import { test } from "node:test";
import assert from "node:assert/strict";
import { rpcRead, PrivacyError, anonStore, setReadMode, bootOrder } from "./manager.ts";
import { NETWORKS } from "./networks.ts";

test("fail closed: anon mode with no worker rejects and NEVER calls fetch", async () => {
  let fetched = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { fetched++; return new Response("{}"); }) as typeof fetch;
  try {
    assert.equal(anonStore.getSnapshot().mode, "anon");
    await assert.rejects(rpcRead("https://example.invalid", "eth_chainId", []), PrivacyError);
    assert.equal(fetched, 0, "must not silently fall back to direct RPC");
    const s = anonStore.getSnapshot();
    assert.equal(s.anonFailed, 1);
    assert.equal(s.directOk + s.directFailed, 0);
    assert.equal(s.log[0].transport, "anon");
    assert.equal(s.log[0].ok, false);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("direct mode is explicit, labelled direct, and counted separately", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }), { status: 200 })) as typeof fetch;
  try {
    setReadMode("direct");
    const r = await rpcRead("https://example.invalid", "eth_chainId", []);
    assert.equal(r, "0x1");
    const s = anonStore.getSnapshot();
    assert.equal(s.directOk, 1);
    assert.equal(s.anonOk, 0);
    assert.equal(s.log[0].transport, "direct");
  } finally {
    globalThis.fetch = realFetch;
    setReadMode("anon");
  }
});

test("log never contains request params", async () => {
  const s = anonStore.getSnapshot();
  assert.ok(s.log.every((e) => Object.keys(e).every((k) => ["id", "ts", "method", "transport", "ok", "ms", "error"].includes(k))));
});

test("boot failover only ever uses anonymising networks, requested one first, never the reference worker", () => {
  const order = bootOrder("nox");
  assert.equal(order[0], "nox");
  assert.ok(order.length > 1, "failover should offer other networks");
  for (const id of order) assert.equal(NETWORKS.find((n) => n.id === id)?.kind, "network", `${id} must be an anonymising network`);
  assert.ok(!order.includes("passthrough"), "passthrough does not anonymise and must never be a failover target");
  assert.deepEqual(bootOrder("tor-js", false), ["tor-js"], "an explicit network choice must not fail over");
});
