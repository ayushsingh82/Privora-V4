// Real-browser end-to-end proof for Privora v4 on Robinhood testnet: Anon-RPC boots, v4 pool state and a v4 Quoter quote
// are read THROUGH the worker, and the Privacy Center shows 0 direct reads.
// Needs a production server on a free port:  npx next build && npx next start -p 3217     (use localhost, not 127.0.0.1)
//   BASE=http://localhost:3217 node --no-warnings scripts/e2e-v4.mts
import { launch } from "./lib/cdp.mts";

const BASE = process.env.BASE ?? "http://localhost:3217";
const p = await launch({ width: 1280, height: 1000 });
let failed = 0;
const step = async (name: string, fn: () => Promise<void>) => {
  const t0 = Date.now();
  try { await fn(); console.log(`  ✔ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }
  catch (e) { failed++; console.log(`  ✖ ${name}\n      ${e instanceof Error ? e.message : e}`); }
};
const hydrated = () => p.waitFor("Object.keys(document.querySelector('a,button')).some(k=>k.startsWith('__react'))", 30000, "hydration");
const stat = (k: string) => p.eval<string>(`document.querySelector('[data-stat="${k}"]')?.textContent ?? ""`);

console.log(`Privora v4 e2e → ${BASE}`);
await p.goto(BASE + "/privacy");
await hydrated();

await step("Anon-RPC worker boots (status: ready)", async () => {
  await p.waitFor("document.querySelector('[data-worker=\"ready\"]') !== null", 170000, "worker ready");
});

await step("Pools page: v4 pool state (StateView) read through Anon-RPC", async () => {
  await p.click("Pools");
  await p.waitFor("/GLD/.test(document.body.innerText) && /SPY/.test(document.body.innerText) && /tick/i.test(document.body.innerText)", 170000, "curated v4 pools");
});

await step("Swap: v4 Quoter quote for ETH → GLD through Anon-RPC", async () => {
  await p.click("Swap");
  await p.waitFor("document.querySelector('input[inputmode=decimal]')", 20000, "swap input");
  await p.type("input[inputmode=decimal]", "0.001");
  await p.waitFor("document.body.innerText.includes('Minimum received')", 170000, "quote");
  const t = await p.eval<string>("document.body.innerText");
  if (!/Uniswap v4 Quoter/.test(t)) throw new Error("quote source is not the v4 Quoter");
  console.log("      " + (t.match(/1 ETH ≈ [^\n]+/)?.[0] ?? "(rate line not found)"));
});

await step("Privacy Center: anonymised reads > 0, direct reads = 0", async () => {
  await p.click("Privacy");
  await p.waitFor("document.querySelector('[data-stat=\"anon-ok\"]') !== null", 10000);
  const ok = Number(await stat("anon-ok")), direct = Number(await stat("direct"));
  if (!(ok > 0)) throw new Error(`expected anonymised reads > 0, got ${ok}`);
  if (direct !== 0) throw new Error(`expected 0 direct reads, got ${direct}`);
  console.log(`      anonymised reads: ${ok}, direct reads: ${direct}`);
});

await p.screenshot(process.env.SHOT ?? "/tmp/privora-v4-privacy.png").catch(() => {});
const errs = p.errors.filter((e) => !/favicon|ERR_BLOCKED|Failed to load resource/.test(e));
if (errs.length) console.log("  console errors:", errs.slice(0, 5));
await p.close();
console.log(failed ? `\n${failed} step(s) FAILED` : "\nAll steps passed");
process.exit(failed ? 1 : 0);
