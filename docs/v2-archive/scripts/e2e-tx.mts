// Real-UI transaction e2e against a LOCAL anvil fork of Sepolia (nothing touches a real network or real funds).
// The wallet is a test-only EIP-1193 stub injected by THIS script that forwards to anvil's unlocked dev account;
// the app code under test is unchanged. Runs in Standard mode (the mixnet exit cannot reach localhost).
//   anvil --fork-url https://ethereum-sepolia-rpc.publicnode.com --chain-id 11155111
//   NEXT_DIST_DIR=.next-fork NEXT_PUBLIC_RPC_URL_SEPOLIA=http://127.0.0.1:8545 npm run build
//   NEXT_DIST_DIR=.next-fork npx next start -p 3201      then:  npm run e2e:tx
import { launch } from "./lib/cdp.mts";

const BASE = process.env.BASE ?? "http://127.0.0.1:3201";
const ANVIL = process.env.ANVIL ?? "http://127.0.0.1:8545";
const ME = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // anvil default dev account #0 (public test key)
const TOKEN = "0x795BfFd201876c31805350Ea4A61A8E28c70685c"; // Sepolia V2 pair #622: TOKEN/WETH with real reserves
const ZERO = "0x0000000000000000000000000000000000000000";

const p = await launch({ width: 1280, height: 1000 });
let failed = 0;
const step = async (name: string, fn: () => Promise<void>) => {
  const t0 = Date.now();
  try { await fn(); console.log(`  ✔ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }
  catch (e) { failed++; console.log(`  ✖ ${name}\n      ${e instanceof Error ? e.message : e}`); }
};
const text = () => p.eval<string>("document.body.innerText");
const rpc = async (method: string, params: unknown[] = []) => (await (await fetch(ANVIL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })).json()).result;

async function load(path: string) {
  await p.goto(BASE + path);
  await p.waitFor("Object.keys(document.querySelector('a,button')).some(k=>k.startsWith('__react'))", 30000, "hydration");
  await p.click("Privacy");                              // the mode switch lives in the Privacy Center
  await p.waitFor("document.querySelector('[data-worker]') !== null", 10000, "privacy center");
  await p.click("Standard");                                   // direct reads from the local fork
  await p.eval(`window.next.router.push(${JSON.stringify(path)}); true`);   // client-side, keeps the mode
  await p.waitFor("document.querySelector('input[inputmode=decimal]') !== null", 15000, "page ready");
  await p.eval(`window.ethereum = { request: async ({method, params}) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return ['${ME}'];
      const r = await fetch('${ANVIL}', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0',id:1,method,params:params||[]}) });
      const j = await r.json(); if (j.error) throw Object.assign(new Error(j.error.message), {code: j.error.code}); return j.result; },
      on() {} }; true`);
  await p.click("Connect wallet");
  await p.waitFor("document.body.innerText.includes('0xf39F')", 10000, "wallet connected");
}
// click the big action button (class w-full) by label, never the header nav links
const act = (label: string) => p.eval<boolean>(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.className.includes('w-full')&&b.textContent.trim().startsWith(${JSON.stringify(label)})&&!b.disabled);if(!b)return false;b.click();return true})()`);
const actWait = async (label: string, ms = 60000) => { await p.waitFor(`[...document.querySelectorAll('button')].some(b=>b.className.includes('w-full')&&b.textContent.trim().startsWith(${JSON.stringify(label)})&&!b.disabled)`, ms, `button "${label}"`); await act(label); };
const confirmed = async (label: string) => {
  const re = `new RegExp('^“' + ${JSON.stringify(label)}.replace(/[.*+?^$()|[\\]\\\\]/g,'\\\\$&') + '[^”]*” confirmed', 'm').test(document.body.innerText)`;
  try { await p.waitFor(re, 60000, `tx "${label}" confirmed`); }
  catch (e) { const t = await text(); throw new Error(`${(e as Error).message}\n      page says: ${(t.match(/“[^\n]*(failed|waiting|Confirm)[^\n]*/) ?? ["(no tx status)"])[0]}`); }
};
const erc20 = async (token: string, selector: string, arg: string) => BigInt(await rpc("eth_call", [{ to: token, data: selector + arg.toLowerCase().replace("0x", "").padStart(64, "0") }, "latest"]));
const balanceOf = (token: string, who: string) => erc20(token, "0x70a08231", who);

console.log(`Privora tx e2e → ${BASE}  (fork ${ANVIL})`);
let tokenBefore = 0n, tokenAfter = 0n;

await step("Swap ETH for token (swapExactETHForTokens) via the real UI", async () => {
  await load(`/swap?from=${ZERO}&to=${TOKEN}`);
  tokenBefore = await balanceOf(TOKEN, ME);
  await p.waitFor("![...document.querySelectorAll('button')].some(b=>b.textContent.includes('Select token'))", 30000, "tokens resolved");
  await p.type("input[inputmode=decimal]", "0.0005");
  await p.waitFor("document.body.innerText.includes('Minimum received')", 30000, "quote");
  await actWait("Swap");
  await confirmed("Swap ETH for ");
  tokenAfter = await balanceOf(TOKEN, ME);
  if (tokenAfter <= tokenBefore) throw new Error(`token balance did not increase (${tokenBefore} -> ${tokenAfter})`);
  console.log(`      token balance ${tokenBefore} -> ${tokenAfter}`);
});

await step("Approve (exact amount) + swap token → ETH (swapExactTokensForETH)", async () => {
  await p.click("button[aria-label='Flip tokens']");
  await p.waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Max')", 30000, "balance loaded");
  await p.type("input[inputmode=decimal]", "50");   // sell exactly 50 tokens; keep the rest for the liquidity step
  await actWait("Approve");
  await confirmed("Approve ");
  const router = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  const allowance = BigInt(await rpc("eth_call", [{ to: TOKEN, data: "0xdd62ed3e" + ME.slice(2).toLowerCase().padStart(64, "0") + router.slice(2).toLowerCase().padStart(64, "0") }, "latest"]));
  if (allowance !== 50n * 10n ** 18n) throw new Error(`allowance ${allowance} != exact 50e18 (unlimited approval?)`);
  // DDOGE charges a 20% transfer tax: the app must simulate, pick the fee-on-transfer router variant, and need slippage > tax.
  await p.click("button[aria-label='Slippage settings']");
  await p.type("input[aria-label='Custom slippage']", "25");
  await p.click("Apply");
  await actWait("Swap");
  await confirmed("Swap ");
  const left = await balanceOf(TOKEN, ME);
  if (left >= tokenAfter) throw new Error("token balance did not decrease");
  console.log(`      sold 50 tokens (20% transfer tax handled): ${tokenAfter} -> ${left}`);
});

let lpBal = 0n;
const PAIR = "0x56033Fc51f277d321DcFA79eEcD5c881a6F3b821";
await step("Add liquidity ETH + token (approve + addLiquidityETH)", async () => {
  await load(`/liquidity?a=${ZERO}&b=${TOKEN}`);
  await p.waitFor("![...document.querySelectorAll('button')].some(b=>b.textContent.includes('Select token'))", 30000, "tokens resolved");
  await p.type("input[inputmode=decimal]", "0.0001");
  await p.waitFor("document.querySelectorAll('input[inputmode=decimal]')[1].value !== ''", 30000, "paired amount auto-filled");
  // wallet needs tokens for the pair amount; top up through a quick swap if short
  await actWait("Approve");
  await confirmed("Approve ");
  await actWait("Add liquidity");
  await confirmed("Add ");
  lpBal = await balanceOf(PAIR, ME);
  if (lpBal === 0n) throw new Error("no LP tokens received");
  console.log(`      LP tokens: ${lpBal}`);
});

await step("Remove 50% liquidity (approve LP + removeLiquidityETH)", async () => {
  await p.waitFor("document.body.innerText.includes('Pool share')", 30000, "position visible");
  await p.click("50%");
  await actWait("Approve LP token");
  await confirmed("Approve LP token");
  await actWait("Remove liquidity");
  await confirmed("Remove ");
  const after = await balanceOf(PAIR, ME);
  if (!(after < lpBal)) throw new Error(`LP balance did not drop (${lpBal} -> ${after})`);
  console.log(`      LP tokens: ${lpBal} -> ${after}`);
});

await p.close();
console.log(failed ? `\n${failed} step(s) FAILED` : "\nAll steps passed");
process.exit(failed ? 1 : 0);
