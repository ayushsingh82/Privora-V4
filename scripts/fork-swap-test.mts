// Real signed swaps (both directions) against a LOCAL anvil fork of the testnet, using the app's own calldata builder.
// Proves ETH→tWIF and tWIF→ETH work end to end (Quoter → Permit2 → Universal Router) with no real funds.
//   anvil --fork-url https://rpc.testnet.chain.robinhood.com --chain-id 46630 --port 8545
//   DEPLOY_OUT=/tmp/fork.json RPC_URL=http://127.0.0.1:8545 DEPLOYER_PRIVATE_KEY=<anvil key> node --no-warnings scripts/deploy-testwif.mts deploy
//   DEPLOY_OUT=/tmp/fork.json RPC_URL=http://127.0.0.1:8545 DEPLOYER_PRIVATE_KEY=<anvil key> node --no-warnings scripts/fork-swap-test.mts
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, decodeFunctionResult, defineChain, encodeFunctionData, formatUnits, http, maxUint256, parseEther, zeroAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encodeExactInSingle, type PoolKey } from "../src/lib/uniswap/v4.ts";
import { erc20Abi, permit2Abi, quoterAbi, universalRouterAbi } from "../src/lib/uniswap/abis.ts";

const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const dep = JSON.parse(readFileSync(process.env.DEPLOY_OUT!, "utf8"));
const chain = defineChain({ id: 46630, name: "fork", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as Hex);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ account, chain, transport: http(RPC) });
const ROUTER: Address = "0x8876789976decbfcbbbe364623c63652db8c0904", QUOTER: Address = "0x8dc178efb8111bb0973dd9d722ebeff267c98f94", PERMIT2: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const key: PoolKey = { currency0: zeroAddress, currency1: dep.token, fee: dep.fee, tickSpacing: dep.tickSpacing, hooks: zeroAddress };
const wait = async (h: Hex) => { const r = await pub.waitForTransactionReceipt({ hash: h }); if (r.status !== "success") throw new Error("reverted " + h); return r; };
const quote = async (zeroForOne: boolean, amt: bigint) => {
  const data = encodeFunctionData({ abi: quoterAbi, functionName: "quoteExactInputSingle", args: [{ poolKey: key, zeroForOne, exactAmount: amt, hookData: "0x" }] });
  const r = await pub.call({ to: QUOTER, data });
  return decodeFunctionResult({ abi: quoterAbi, functionName: "quoteExactInputSingle", data: r.data! })[0];
};
const tw = () => pub.readContract({ address: dep.token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
const dl = () => BigInt(Math.floor(Date.now() / 1000) + 1800);
let ok = true; const check = (n: string, c: boolean, d = "") => { console.log(`${c ? "✔" : "✖"} ${n} ${d}`); if (!c) ok = false; };

// ETH → tWIF
const inEth = parseEther("0.001");
const q1 = await quote(true, inEth);
console.log(`quote: 0.001 ETH → ${formatUnits(q1, 18)} tWIF`);
const b0 = await tw();
let e = encodeExactInSingle({ key, zeroForOne: true, amountIn: inEth, minOut: (q1 * 995n) / 1000n });
await wait(await wallet.writeContract({ address: ROUTER, abi: universalRouterAbi, functionName: "execute", args: [e.commands, e.inputs, dl()], value: inEth }));
const b1 = await tw();
check("ETH → tWIF swap executed", b1 - b0 >= (q1 * 995n) / 1000n, `(received ${formatUnits(b1 - b0, 18)} tWIF, quoted ${formatUnits(q1, 18)})`);

// tWIF → ETH (needs Permit2: it was approved by the deploy script for the PositionManager only; approve the router now)
const inTw = parseEther("500");
await wait(await wallet.writeContract({ address: dep.token, abi: erc20Abi, functionName: "approve", args: [PERMIT2, maxUint256] }));
await wait(await wallet.writeContract({ address: PERMIT2, abi: permit2Abi, functionName: "approve", args: [dep.token, ROUTER, 2n ** 160n - 1n, Math.floor(Date.now() / 1000) + 1800] }));
const q2 = await quote(false, inTw);
console.log(`quote: 500 tWIF → ${formatUnits(q2, 18)} ETH`);
const eth0 = await pub.getBalance({ address: account.address });
e = encodeExactInSingle({ key, zeroForOne: false, amountIn: inTw, minOut: (q2 * 995n) / 1000n });
const r = await wait(await wallet.writeContract({ address: ROUTER, abi: universalRouterAbi, functionName: "execute", args: [e.commands, e.inputs, dl()] }));
const eth1 = await pub.getBalance({ address: account.address });
const gas = r.gasUsed * r.effectiveGasPrice;
check("tWIF → ETH swap executed", eth1 + gas - eth0 >= (q2 * 995n) / 1000n, `(received ${formatUnits(eth1 + gas - eth0, 18)} ETH, quoted ${formatUnits(q2, 18)})`);
process.exit(ok ? 0 : 1);
