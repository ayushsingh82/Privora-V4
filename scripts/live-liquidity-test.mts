// REAL add-liquidity on the live Robinhood testnet (full range, Guard-hooked ETH/tWIF pool) with wallet B (.env.b.local).
//   node --no-warnings scripts/live-liquidity-test.mts [ethAmount]
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, formatUnits, http, parseEther, zeroAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { erc20Abi, permit2Abi, stateViewAbi } from "../src/lib/uniswap/abis.ts";
import { encodeMintFullRange, liquidityForEth, positionManagerAbi } from "../src/lib/uniswap/liquidity.ts";
import { DEPLOYED } from "../src/lib/deployed.ts";
import { DEPLOYED_HOOK } from "../src/lib/deployedHook.ts";

const RPC = "https://rpc.testnet.chain.robinhood.com";
const PM: Address = "0x58daec3116aae6d93017baaea7749052e8a04fa7", PERMIT2: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3", STATE_VIEW: Address = "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
const pk = readFileSync(".env.b.local", "utf8").match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})/)![1] as Hex;
const chain = defineChain({ id: 46630, name: "Robinhood Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ account, chain, transport: http(RPC) });
const token = DEPLOYED!.token as Address;
const key = { currency0: zeroAddress, currency1: token, fee: DEPLOYED_HOOK!.fee, tickSpacing: DEPLOYED_HOOK!.tickSpacing, hooks: DEPLOYED_HOOK!.hook as Address };
const wait = async (h: Hex) => { const r = await pub.waitForTransactionReceipt({ hash: h }); if (r.status !== "success") throw new Error("reverted " + h); return r; };

const poolId = DEPLOYED_HOOK!.poolId as Hex;
const [sqrtP] = (await pub.readContract({ address: STATE_VIEW, abi: stateViewAbi, functionName: "getSlot0", args: [poolId] })) as readonly [bigint, number, number, number];
const liq0 = await pub.readContract({ address: STATE_VIEW, abi: stateViewAbi, functionName: "getLiquidity", args: [poolId] });
const c = liquidityForEth(parseEther(process.argv[2] ?? "0.0002"), sqrtP);
console.log(`pool liquidity before: ${liq0}; adding L=${c.liquidity} needs ~${formatUnits(c.token, 18)} tWIF`);

await wait(await wallet.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [PERMIT2, c.amount1Max] }));
await wait(await wallet.writeContract({ address: PERMIT2, abi: permit2Abi, functionName: "approve", args: [token, PM, c.amount1Max, Math.floor(Date.now() / 1000) + 1800] }));
const unlock = encodeMintFullRange({ key, liquidity: c.liquidity, amount0Max: c.amount0Max, amount1Max: c.amount1Max, recipient: account.address });
const req = { address: PM, abi: positionManagerAbi, functionName: "modifyLiquidities", args: [unlock, BigInt(Math.floor(Date.now() / 1000) + 1800)], value: c.amount0Max } as const;
await pub.simulateContract({ ...req, account });
const h = await wallet.writeContract(req);
await wait(h);
const liq1 = await pub.readContract({ address: STATE_VIEW, abi: stateViewAbi, functionName: "getLiquidity", args: [poolId] });
const nfts = await pub.readContract({ address: PM, abi: positionManagerAbi, functionName: "balanceOf", args: [account.address] });
console.log(`ADD LIQUIDITY tx ${h}\npool liquidity after: ${liq1} (+${liq1 - liq0}); wallet v4 positions: ${nfts}`);
