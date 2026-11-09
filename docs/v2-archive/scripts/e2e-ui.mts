// UI e2e (real headless Chrome): every route renders, no console errors, no horizontal overflow on phone/desktop,
// navigation, mode toggle, and that Settings persist and reach the swap card.  Needs `npm run build && npm start`.
//   npm run e2e:ui
import { launch } from "./lib/cdp.mts";

const BASE = process.env.BASE ?? "http://127.0.0.1:3200";
const ROUTES = ["/", "/pitch", "/swap", "/liquidity", "/pools", "/privacy", "/settings"];
let failed = 0;
const step = async (name: string, fn: () => Promise<void>) => {
  try { await fn(); console.log(`  ✔ ${name}`); } catch (e) { failed++; console.log(`  ✖ ${name}\n      ${e instanceof Error ? e.message : e}`); }
};
const hydrated = (p: Awaited<ReturnType<typeof launch>>) => p.waitFor("Object.keys(document.querySelector('a,button')).some(k=>k.startsWith('__react'))", 30000, "hydration");
const NOISE = /favicon|ERR_BLOCKED|Failed to load resource|\[worker\]/;

console.log(`Privora UI e2e → ${BASE}`);

for (const [label, w] of [["desktop 1280px", 1280], ["phone 390px", 390]] as const) {
  const p = await launch({ width: w, height: 900 });
  await step(`${label}: all routes render, no console errors, no horizontal overflow`, async () => {
    for (const r of ROUTES) {
      await p.goto(BASE + r);
      await hydrated(p);
      await p.waitFor("document.querySelector('h1, h2')", 10000, `heading on ${r}`);
      const over = await p.eval<number>("document.documentElement.scrollWidth - window.innerWidth");
      if (over > 1) throw new Error(`${r}: horizontal overflow of ${over}px`);
    }
    const errs = p.errors.filter((e) => !NOISE.test(e));
    if (errs.length) throw new Error(`console errors: ${errs.slice(0, 3).join(" | ")}`);
  });
  await p.close();
}

const p = await launch({ width: 1280, height: 900 });
await p.goto(BASE + "/swap");
await hydrated(p);

await step("landing page has an Open app button that opens the dashboard", async () => {
  const q = await launch({ width: 1280, height: 900 });
  await q.goto(BASE + "/");
  await hydrated(q);
  await q.click("Open app");
  await q.waitFor("document.body.innerText.includes('You pay')", 15000, "swap page");
  await q.close();
});

await step("brand: title, logo and sidebar say Privora", async () => {
  const t = await p.eval<string>("document.title");
  if (!t.startsWith("Privora")) throw new Error(`title was "${t}"`);
  if (!(await p.eval<boolean>("document.querySelector('aside svg') !== null && document.querySelector('aside').innerText.includes('Privora')"))) throw new Error("header brand missing");
  if (await p.eval<boolean>("document.body.innerText.includes('PrivateSwap')")) throw new Error("old name still visible");
});

await step("sidebar reaches every page (client-side)", async () => {
  for (const [label, heading] of [["Liquidity", "Add liquidity"], ["Pools", "Pools"], ["Privacy", "Privacy Center"], ["Settings", "Slippage tolerance"], ["Swap", "You pay"]] as const) {
    await p.click(label);
    await p.waitFor(`document.body.innerText.includes(${JSON.stringify(heading)})`, 10000, `${label} → "${heading}"`);
  }
});

await step("mode toggle: Standard shows the direct-RPC warning, Anon-RPC clears it", async () => {
  await p.click("Privacy");
  await p.waitFor("document.querySelector('[data-worker]') !== null", 10000, "privacy center");
  await p.click("Standard");
  await p.waitFor("document.body.innerText.includes('Standard RPC: reads go directly')", 5000, "direct banner");
  if (!(await p.eval<boolean>("document.body.innerText.includes('Standard RPC (direct)')"))) throw new Error("indicator does not say Standard RPC (direct)");
  await p.click("Anon-RPC");
  await p.waitFor("!document.body.innerText.includes('Standard RPC: reads go directly')", 5000, "banner cleared");
});

await step("Settings persist (localStorage) and flow into the swap card", async () => {
  await p.click("Settings");
  await p.waitFor("document.body.innerText.includes('Slippage tolerance')", 10000);
  await p.eval("[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='1%').click()");   // exact match ("0.1%" and "10%" also contain "1%")
  await p.goto(BASE + "/swap");             // full reload: must be restored from storage
  await hydrated(p);
  await p.waitFor("document.querySelector('[data-slippage]')?.getAttribute('data-slippage') === '100'", 10000, "slippage select = 1% after reload");
});

await step("swap button states: Connect wallet when disconnected", async () => {
  const label = await p.eval<string>("[...document.querySelectorAll('button')].find(b=>b.className.includes('w-full'))?.textContent.trim()");
  if (label !== "Connect wallet") throw new Error(`primary button said "${label}"`);
});

await step("token selector opens, filters and shows validation hint", async () => {
  await p.click("ETH");
  await p.waitFor("document.body.innerText.includes('Select a token')", 5000);
  await p.type("input[placeholder^='Search']", "zzzz");
  await p.waitFor("document.body.innerText.includes('No match')", 5000, "no-match message");
  await p.type("input[placeholder^='Search']", "not-an-address");
  if (await p.eval<boolean>("document.body.innerText.includes('Look up & validate')")) throw new Error("lookup offered for an invalid address");
});

await p.close();
console.log(failed ? `\n${failed} step(s) FAILED` : "\nAll steps passed");
process.exit(failed ? 1 : 0);
