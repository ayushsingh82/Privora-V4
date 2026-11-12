// REAL signed swaps on the live Robinhood testnet through the Privora Guard hooked pool, using wallet B (.env.b.local).
//   node --no-warnings scripts/live-swap-test.mts
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, decodeFunctionResult, defineChain, encodeFunctionData, formatUnits, http, maxUint256, parseEther, zeroAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encodeExactInSingle, type PoolKey } from "../src/lib/uniswap/v4.ts";
import { erc20Abi, permit2Abi, quoterAbi, universalRouterAbi } from "../src/lib/uniswap/abis.ts";
import { DEPLOYED } from "../src/lib/deployed.ts";
import { DEPLOYED_HOOK } from "../src/lib/deployedHook.ts";

const RPC = "https://rpc.testnet.chain.robinhood.com";
const pk = readFileSync(".env.b.local", "utf8").match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})/)![1] as Hex;
const chain = defineChain({ id: 46630, name: "Robinhood Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ account, chain, transport: http(RPC) });
const ROUTER: Address = "0x8876789976decbfcbbbe364623c63652db8c0904", QUOTER: Address = "0x8dc178efb8111bb0973dd9d722ebeff267c98f94", PERMIT2: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const token = DEPLOYED!.token as Address;
const key: PoolKey = { currency0: zeroAddress, currency1: token, fee: DEPLOYED_HOOK!.fee, tickSpacing: DEPLOYED_HOOK!.tickSpacing, hooks: DEPLOYED_HOOK!.hook as Address };
const wait = async (h: Hex) => { const r = await pub.waitForTransactionReceipt({ hash: h }); if (r.status !== "success") throw new Error("reverted " + h); return r; };
const quote = async (z: boolean, amt: bigint) => {
  const data = encodeFunctionData({ abi: quoterAbi, functionName: "quoteExactInputSingle", args: [{ poolKey: key, zeroForOne: z, exactAmount: amt, hookData: "0x" }] });
  const r = await pub.call({ to: QUOTER, data });
  return decodeFunctionResult({ abi: quoterAbi, functionName: "quoteExactInputSingle", data: r.data! })[0];
};
const tw = () => pub.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
const dl = () => BigInt(Math.floor(Date.now() / 1000) + 1800);

console.log("wallet", account.address);
const inEth = parseEther("0.00005");
const q1 = await quote(true, inEth);
console.log(`quote 0.00005 ETH -> ${formatUnits(q1, 18)} tWIF`);
const b0 = await tw();
let e = encodeExactInSingle({ key, zeroForOne: true, amountIn: inEth, minOut: (q1 * 99n) / 100n });
const h1 = await wallet.writeContract({ address: ROUTER, abi: universalRouterAbi, functionName: "execute", args: [e.commands, e.inputs, dl()], value: inEth });
await wait(h1);
const b1 = await tw();
console.log(`BUY  tx ${h1}\n     received ${formatUnits(b1 - b0, 18)} tWIF`);

const sell = (b1 - b0) / 2n;
await wait(await wallet.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [PERMIT2, maxUint256] }));
await wait(await wallet.writeContract({ address: PERMIT2, abi: permit2Abi, functionName: "approve", args: [token, ROUTER, 2n ** 160n - 1n, Math.floor(Date.now() / 1000) + 1800] }));
const q2 = await quote(false, sell);
e = encodeExactInSingle({ key, zeroForOne: false, amountIn: sell, minOut: (q2 * 99n) / 100n });
const h2 = await wallet.writeContract({ address: ROUTER, abi: universalRouterAbi, functionName: "execute", args: [e.commands, e.inputs, dl()] });
await wait(h2);
console.log(`SELL tx ${h2}\n     sold ${formatUnits(sell, 18)} tWIF, quoted ${formatUnits(q2, 18)} ETH`);

try { await quote(true, parseEther("0.001")); console.log("BLOCK test: NOT blocked (unexpected)"); }
catch { console.log("BLOCK test: 0.001 ETH rejected by Guard hook (expected)"); }
