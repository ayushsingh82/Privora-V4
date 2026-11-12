// REAL remove-liquidity on the live Robinhood testnet with wallet B (.env.b.local): removes the newest position it owns (100%, burn).
//   node --no-warnings scripts/live-remove-liquidity-test.mts
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, formatEther, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encodeDecrease, liquidityShare, positionManagerAbi, transferEvent } from "../src/lib/uniswap/liquidity.ts";

const RPC = "https://rpc.testnet.chain.robinhood.com";
const PM: Address = "0x58daec3116aae6d93017baaea7749052e8a04fa7";
const pk = readFileSync(".env.b.local", "utf8").match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})/)![1] as Hex;
const chain = defineChain({ id: 46630, name: "Robinhood Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ account, chain, transport: http(RPC) });

const head = await pub.getBlockNumber();
const logs = await pub.getLogs({ address: PM, event: transferEvent, args: { to: account.address }, fromBlock: head - 9_000_000n, toBlock: head });
const ids = [...new Set(logs.map((l) => l.args.id!))].sort((a, b) => (a < b ? 1 : -1));
const id = ids[0];
const [key] = await pub.readContract({ address: PM, abi: positionManagerAbi, functionName: "getPoolAndPositionInfo", args: [id] });
const liq = await pub.readContract({ address: PM, abi: positionManagerAbi, functionName: "getPositionLiquidity", args: [id] });
console.log(`position #${id} liquidity ${liq} in pool with hook ${key.hooks}`);
const unlock = encodeDecrease({ key, tokenId: id, liquidity: liquidityShare(liq, 100), burn: true, recipient: account.address });
const req = { address: PM, abi: positionManagerAbi, functionName: "modifyLiquidities", args: [unlock, BigInt(Math.floor(Date.now() / 1000) + 1800)] } as const;
await pub.simulateContract({ ...req, account });
const eth0 = await pub.getBalance({ address: account.address });
const h = await wallet.writeContract(req);
const r = await pub.waitForTransactionReceipt({ hash: h });
if (r.status !== "success") throw new Error("reverted " + h);
const eth1 = await pub.getBalance({ address: account.address });
const owner = await pub.readContract({ address: PM, abi: positionManagerAbi, functionName: "ownerOf", args: [id] }).catch(() => "burned");
console.log(`REMOVE LIQUIDITY tx ${h}\nETH back (net of gas): ${formatEther(eth1 - eth0 + r.gasUsed * r.effectiveGasPrice)}; position #${id} owner now: ${owner}`);
