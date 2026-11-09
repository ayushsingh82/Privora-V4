// REAL Sepolia end-to-end: the app runs in default Anon-RPC mode (all reads through the mixnet) while a throwaway test
// wallet signs and sends REAL transactions on Sepolia. The wallet is a test-only EIP-1193 stub injected by THIS script;
// a tiny local signer (viem) holds the key, which is read from a file OUTSIDE the repo. Nothing secret is printed or stored.
//   PRIVORA_TEST_WALLET=/path/to/wallet.json  npm run e2e:sepolia      (needs `npm run build && npm start`)
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { launch } from "./lib/cdp.mts";

const BASE = process.env.BASE ?? "http://127.0.0.1:3200";
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";      // used ONLY by the signer and for verification, not by the app
const keyFile = process.env.PRIVORA_TEST_WALLET;
if (!keyFile) throw new Error("set PRIVORA_TEST_WALLET to the wallet JSON file (outside the repo)");
const w = JSON.parse(readFileSync(keyFile, "utf8"))[0];
const account = privateKeyToAccount((w.private_key ?? w.privateKey) as `0x${string}`);
const ME = account.address;
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });
const TOKEN = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";   // Sepolia USDC (6 decimals), live V2 pool against WETH
const DEC = 6, SELL = "20";
const ZERO = "0x0000000000000000000000000000000000000000";
const hashes: string[] = [];

// local signer the injected wallet calls
const signer = createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*"); res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") { res.end(); return; }
  let body = ""; for await (const c of req) body += c;
  const { method, params } = JSON.parse(body);
  try {
    let result: unknown;
    if (method === "eth_sendTransaction") {
      const t = params[0];
      const hash = await wallet.sendTransaction({ to: t.to, data: t.data, value: t.value ? BigInt(t.value) : undefined, gas: t.gas ? BigInt(t.gas) : undefined });
      hashes.push(hash); result = hash;
    } else {
      const r = await (await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })).json();
      if (r.error) throw new Error(r.error.message);
      result = r.result;
    }
    res.end(JSON.stringify({ result }));
  } catch (e) { res.end(JSON.stringify({ error: { message: e instanceof Error ? e.message : String(e) } })); }
}).listen(8546, "127.0.0.1");
const SIGNER = "http://127.0.0.1:8546";

const p = await launch({ width: 1280, height: 1000 });
let failed = 0;
const step = async (name: string, fn: () => Promise<void>) => {
  const t0 = Date.now();
  try { await fn(); console.log(`  ✔ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }
  catch (e) { failed++; console.log(`  ✖ ${name}\n      ${e instanceof Error ? e.message : e}`); }
};
const text = () => p.eval<string>("document.body.innerText");
const rpc = async (method: string, params: unknown[] = []) => (await (await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })).json()).result;

let loaded = false;
async function load(path: string) {
  if (loaded) {
    // Navigate inside the app: a full reload would restart the Anon-RPC worker (slow on a public mixnet) and drop the wallet.
    await p.eval(`window.next.router.push(${JSON.stringify(path)}); true`);
    await p.waitFor("document.querySelector('input[inputmode=decimal]') !== null", 30000, "page ready");
    return;
  }
  await p.goto(BASE + path);
  await p.waitFor("Object.keys(document.querySelector('a,button')).some(k=>k.startsWith('__react'))", 30000, "hydration");
  await p.waitFor("document.body.innerText.includes('reads are anonymised')", 180000, "Anon-RPC worker ready");
  await p.eval(`window.ethereum = { request: async ({method, params}) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return ['${ME}'];
      const r = await fetch('${SIGNER}', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({method,params:params||[]}) });
      const j = await r.json(); if (j.error) throw Object.assign(new Error(j.error.message), {code: j.error.code}); return j.result; },
      on() {} }; true`);
  await p.click("Connect wallet");
  await p.waitFor(`document.body.innerText.includes('${ME.slice(0, 6)}')`, 15000, "wallet connected");
  loaded = true;
}
// click the big action button (class w-full) by label, never the header nav links
const act = (label: string) => p.eval<boolean>(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.className.includes('w-full')&&b.textContent.trim().startsWith(${JSON.stringify(label)})&&!b.disabled);if(!b)return false;b.click();return true})()`);
const actWait = async (label: string, ms = 240000) => { await p.waitFor(`[...document.querySelectorAll('button')].some(b=>b.className.includes('w-full')&&b.textContent.trim().startsWith(${JSON.stringify(label)})&&!b.disabled)`, ms, `button "${label}"`); await act(label); };
const confirmed = async (label: string) => {
  const re = `new RegExp('^“' + ${JSON.stringify(label)}.replace(/[.*+?^$()|[\\]\\\\]/g,'\\\\$&') + '[^”]*” confirmed', 'm').test(document.body.innerText)`;
  try { await p.waitFor(re, 300000, `tx "${label}" confirmed`); }
  catch (e) { const t = await text(); throw new Error(`${(e as Error).message}\n      page says: ${(t.match(/“[^\n]*(failed|waiting|Confirm)[^\n]*/) ?? ["(no tx status)"])[0]}`); }
};
const erc20 = async (token: string, selector: string, arg: string) => BigInt(await rpc("eth_call", [{ to: token, data: selector + arg.toLowerCase().replace("0x", "").padStart(64, "0") }, "latest"]));
const balanceOf = (token: string, who: string) => erc20(token, "0x70a08231", who);

console.log(`Privora REAL Sepolia e2e → ${BASE}  wallet ${ME}`);
let tokenBefore = 0n, tokenAfter = 0n;

await step("Swap ETH for token on real Sepolia, reads through Anon-RPC", async () => {
  await load(`/swap?from=${ZERO}&to=${TOKEN}`);
  tokenBefore = await balanceOf(TOKEN, ME);
  await p.waitFor("![...document.querySelectorAll('button')].some(b=>b.textContent.includes('Select token'))", 240000, "tokens resolved");
  await p.type("input[inputmode=decimal]", "0.002");
  await p.waitFor("document.body.innerText.includes('Minimum received')", 240000, "quote");
  await actWait("Swap");
  await confirmed("Swap ETH for ");
  tokenAfter = await balanceOf(TOKEN, ME);
  if (tokenAfter <= tokenBefore) throw new Error(`token balance did not increase (${tokenBefore} -> ${tokenAfter})`);
  console.log(`      token balance ${tokenBefore} -> ${tokenAfter}`);
});

await step("Approve (exact amount) + swap token → ETH (swapExactTokensForETH)", async () => {
  await p.click("button[aria-label='Flip tokens']");
  await p.waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Max')", 240000, "balance loaded");
  await p.type("input[inputmode=decimal]", SELL);   // sell exactly 20 USDC; keep the rest for the liquidity step
  await actWait("Approve");
  await confirmed("Approve ");
  const router = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
  const allowance = BigInt(await rpc("eth_call", [{ to: TOKEN, data: "0xdd62ed3e" + ME.slice(2).toLowerCase().padStart(64, "0") + router.slice(2).toLowerCase().padStart(64, "0") }, "latest"]));
  if (allowance !== BigInt(SELL) * 10n ** BigInt(DEC)) throw new Error(`allowance ${allowance} != exact ${SELL} USDC (unlimited approval?)`);
  await actWait("Swap");
  await confirmed("Swap ");
  const left = await balanceOf(TOKEN, ME);
  if (left >= tokenAfter) throw new Error("token balance did not decrease");
  console.log(`      sold ${SELL} USDC: ${tokenAfter} -> ${left}`);
});

let lpBal = 0n;
const PAIR = "0x72e46e15ef83c896de44B1874B4AF7dDAB5b4F74";   // USDC / WETH
await step("Add liquidity ETH + token (approve + addLiquidityETH)", async () => {
  await load(`/liquidity?a=${ZERO}&b=${TOKEN}`);
  await p.waitFor("![...document.querySelectorAll('button')].some(b=>b.textContent.includes('Select token'))", 240000, "tokens resolved");
  await p.type("input[inputmode=decimal]", "0.0001");
  await p.waitFor("document.querySelectorAll('input[inputmode=decimal]')[1].value !== ''", 240000, "paired amount auto-filled");
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
  await p.waitFor("document.body.innerText.includes('Pool share')", 240000, "position visible");
  await p.click("50%");
  await actWait("Approve LP token");
  await confirmed("Approve LP token");
  await actWait("Remove liquidity");
  await confirmed("Remove ");
  const after = await balanceOf(PAIR, ME);
  if (!(after < lpBal)) throw new Error(`LP balance did not drop (${lpBal} -> ${after})`);
  console.log(`      LP tokens: ${lpBal} -> ${after}`);
});

await step("Privacy Center after real transactions: reads anonymised, direct reads = 0", async () => {
  await p.click("Privacy");
  await p.waitFor("Number(document.querySelector('[data-stat=anon-ok]')?.textContent) > 0", 20000, "anonymised reads counted");
  const anon = Number(await p.eval<string>("document.querySelector('[data-stat=anon-ok]').textContent"));
  const direct = Number(await p.eval<string>("document.querySelector('[data-stat=direct]').textContent"));
  console.log(`      anonymised reads: ${anon}, direct reads: ${direct}`);
  if (direct !== 0) throw new Error(`direct reads = ${direct}`);
});
console.log("      tx hashes:\n" + hashes.map((h) => `        https://sepolia.etherscan.io/tx/${h}`).join("\n"));
signer.close();
await p.close();
console.log(failed ? `\n${failed} step(s) FAILED` : "\nAll steps passed");
process.exit(failed ? 1 : 0);
