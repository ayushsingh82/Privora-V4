// Real-browser end-to-end proof that reads go through the Anon-RPC worker (headless Chrome, throwaway profile).
// Needs a production server:  npm run build && npm start     (default http://127.0.0.1:3200)
//   npm run e2e
import { launch } from "./lib/cdp.mts";

const BASE = process.env.BASE ?? "http://127.0.0.1:3200";
const p = await launch({ width: 1280, height: 1000 });
let failed = 0;
const step = async (name: string, fn: () => Promise<void>) => {
  const t0 = Date.now();
  try { await fn(); console.log(`  ✔ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }
  catch (e) { failed++; console.log(`  ✖ ${name}\n      ${e instanceof Error ? e.message : e}`); }
};
const text = () => p.eval<string>("document.body.innerText");
const STAT: Record<string, string> = { "Anonymised reads ✓": "anon-ok", "Direct reads": "direct" };
const stat = async (label: string) => p.eval<string>(`document.querySelector('[data-stat="${STAT[label]}"]')?.textContent ?? ""`);
const hydrated = () => p.waitFor("Object.keys(document.querySelector('a,button')).some(k=>k.startsWith('__react'))", 30000, "hydration");
const nav = async (label: string) => { await p.click(label); };   // client-side navigation keeps the worker alive

console.log(`Privora e2e → ${BASE}`);
await p.goto(BASE + "/privacy");
await hydrated();

await step("Anon-RPC worker boots and passes hash-pinned load (status: ready)", async () => {
  await p.waitFor("document.querySelector('[data-worker=\"ready\"]') !== null", 150000, "worker ready");
});

await step("Pools page loads real Uniswap V2 pairs through Anon-RPC", async () => {
  await nav("Pools");
  await p.waitFor("document.body.innerText.toLowerCase().includes('lp supply')", 150000, "pool cards");
});

await step("Privacy Center: anonymised reads > 0, direct reads = 0, rows labelled Anon-RPC", async () => {
  await nav("Privacy");
  await p.waitFor("document.querySelector('[data-stat=\"anon-ok\"]') !== null", 10000);
  const ok = Number(await stat("Anonymised reads ✓"));
  const direct = Number(await stat("Direct reads"));
  if (!(ok > 0)) throw new Error(`expected anonymised reads > 0, got ${ok}`);
  if (direct !== 0) throw new Error(`expected 0 direct reads, got ${direct}`);
  const rows = await p.eval<number>("[...document.querySelectorAll('tbody tr')].filter(r=>r.innerText.includes('eth_call') && r.innerText.includes('Anon-RPC') && r.innerText.includes('Success')).length");
  if (rows < 1) throw new Error("no eth_call / Anon-RPC / Success row in activity log");
  console.log(`      anonymised reads: ${ok}, direct reads: ${direct}, eth_call rows: ${rows}`);
});

await step("Swap quote: V2 router getAmountsOut for a real Sepolia pair, read through Anon-RPC", async () => {
  // Pair #311 of the Sepolia V2 factory (has real reserves, verified separately with a direct call).
  await p.goto(`${BASE}/swap?from=0x174F4259E885EBaFcDc6c09f38a493c4CA90b85e&to=0x832262D88e6C02A31C7C267B6536cFafe7Fdf3E8`);
  await hydrated();
  await p.waitFor("document.querySelector('input[inputmode=decimal]')", 20000, "swap input");
  // wait for the worker + token lookups (both are Anon-RPC reads), then type an amount
  await p.waitFor("![...document.querySelectorAll('button')].some(b=>b.textContent.includes('Select token'))", 120000, "tokens resolved via Anon-RPC");
  await p.type("input[inputmode=decimal]", "0.000001");
  await p.waitFor("document.body.innerText.includes('Minimum received')", 120000, "quote");
  const t = await text();
  if (!/Anon-RPC\s+active, reads are anonymised/.test(t)) throw new Error("swap card does not state Anon-RPC as read transport");
  console.log("      " + (t.match(/Rate\n[^\n]+/)?.[0] ?? "").replace("\n", " "));
  // Network-level proof of hiding: the page's own requests to the RPC host. After the one-time worker bootstrap there must be
  // none, however many more quotes we ask for (they all go through the worker instead).
  const rpcHits = () => p.eval<number>("performance.getEntriesByType('resource').filter(e => e.name.includes('publicnode')).length");
  const before = await rpcHits();
  await p.type("input[inputmode=decimal]", "0.000002");
  await new Promise((r) => setTimeout(r, 12000));          // a few mixnet round trips
  const after = await rpcHits();
  console.log(`      requests from this page to the RPC host: ${before} before, ${after} after more reads (bootstrap only)`);
  if (after !== before) throw new Error(`the page contacted the RPC host directly during Anon-RPC reads (${before} -> ${after})`);
  await nav("Privacy");
  await p.waitFor("document.querySelector('[data-stat=\"anon-ok\"]') !== null", 10000);
  if (Number(await stat("Direct reads")) !== 0) throw new Error("direct reads happened during Anon-RPC quote");
});

await step("Standard mode generates DIRECT reads and the log says so", async () => {
  await nav("Privacy");
  await p.click("Standard");            // mode switch lives in the Privacy Center
  await nav("Pools");
  await p.waitFor("document.body.innerText.toLowerCase().includes('lp supply')", 60000);
  await nav("Privacy");
  await p.waitFor("document.querySelector('[data-stat=\"anon-ok\"]') !== null", 10000);
  await p.waitFor("Number(document.querySelector('[data-stat=\"direct\"]')?.textContent) > 0", 30000, "direct reads counted");
  const rows = await p.eval<number>("[...document.querySelectorAll('tbody tr')].filter(r=>r.innerText.includes('Direct RPC') && r.innerText.includes('Success')).length");
  if (rows < 1) throw new Error("no Direct RPC row");
});

await step("Fail-closed: killed worker => reads fail visibly, NO direct fallback", async () => {
  await p.click("Anon-RPC");            // Privacy Center switch back to Anon-RPC mode
  await new Promise((r) => setTimeout(r, 4000));   // let Standard-mode reads that were already in flight land, so the baseline is stable
  const before = Number(await stat("Direct reads"));
  await p.click("Kill worker");
  await p.waitFor("document.querySelector('[data-worker=\"failed\"]') !== null", 5000);
  await nav("Pools");
  await p.waitFor("document.body.innerText.includes('Anon-RPC unavailable')", 10000, "unavailable banner");
  await new Promise((r) => setTimeout(r, 3000));   // give any (buggy) fallback time to show up
  await nav("Privacy");
  await p.waitFor("document.querySelector('[data-stat=\"anon-ok\"]') !== null", 10000);
  const after = Number(await stat("Direct reads"));
  if (after !== before) throw new Error(`direct reads changed ${before} -> ${after}: SILENT FALLBACK`);
});

await step("Restart worker recovers Anon-RPC", async () => {
  await p.click("Restart worker");
  await p.waitFor("document.querySelector('[data-worker=\"ready\"]') !== null", 150000, "worker ready again");
});

await p.screenshot(process.env.SHOT ?? "/tmp/privora-privacy.png").catch(() => {});
const errs = p.errors.filter((e) => !/favicon|ERR_BLOCKED|Failed to load resource/.test(e));
if (errs.length) console.log("  console errors:", errs.slice(0, 5));
await p.close();
console.log(failed ? `\n${failed} step(s) FAILED` : "\nAll steps passed");
process.exit(failed ? 1 : 0);
