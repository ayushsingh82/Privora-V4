// Deploys PrivoraGuardHook on Robinhood testnet via the CREATE2 proxy (salt mined so the address carries the
// BEFORE_SWAP|AFTER_SWAP flags), then creates a hooked ETH/tWIF v4 pool and adds full-range liquidity.
// Writes src/lib/deployedHook.ts. Needs: `cd contracts && forge build`, src/lib/deployed.ts (tWIF), DEPLOYER_PRIVATE_KEY.
//   ETH_LIQ=0.002  MAX_MOVE_BPS=1000  node --no-warnings scripts/deploy-hook.mts [check|deploy]
import { readFileSync, writeFileSync } from "node:fs";
import { concat, createPublicClient, createWalletClient, defineChain, encodeAbiParameters, encodeFunctionData, encodePacked, formatEther, getContractAddress, http, keccak256, maxUint256, pad, parseEther, toHex, zeroAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { poolId, type PoolKey } from "../src/lib/uniswap/v4.ts";
import { permit2Abi, erc20Abi, stateViewAbi } from "../src/lib/uniswap/abis.ts";
import { DEPLOYED } from "../src/lib/deployed.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const mode = process.argv[2] ?? "check";
const RPC = process.env.RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
const A = { poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951", positionManager: "0x58daec3116aae6d93017baaea7749052e8a04fa7", permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3", stateView: "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b", create2: "0x4e59b44847b379578588920cA78FbF26c0B4956C" } as const satisfies Record<string, Address>;
if (!DEPLOYED) { console.error("src/lib/deployed.ts is null: deploy tWIF first."); process.exit(1); }
const token = DEPLOYED.token as Address;
const chain = defineChain({ id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pk = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined;
if (!pk) { console.error("Set DEPLOYER_PRIVATE_KEY (testnet only)."); process.exit(1); }
const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ account, chain, transport: http(RPC) });
const ETH_LIQ = parseEther(process.env.ETH_LIQ ?? "0.002");
const MAX_MOVE_BPS = BigInt(process.env.MAX_MOVE_BPS ?? "1000");
const FLAGS = 0x00c0n, MASK = 0x3fffn;

const art = JSON.parse(readFileSync(ROOT + "contracts/out/PrivoraGuardHook.sol/PrivoraGuardHook.json", "utf8"));
const initCode = concat([art.bytecode.object as Hex, encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [A.poolManager, MAX_MOVE_BPS])]);
const initHash = keccak256(initCode);
let salt: Hex = "0x", hook: Address = zeroAddress;
for (let i = 0n; ; i++) {
  salt = pad(toHex(i), { size: 32 });
  hook = getContractAddress({ opcode: "CREATE2", from: A.create2, salt, bytecodeHash: initHash });
  if ((BigInt(hook) & MASK) === FLAGS) break;
}
const bal = await pub.getBalance({ address: account.address });
console.log(`deployer ${account.address} balance ${formatEther(bal)} ETH\nmined hook address ${hook} (salt ${salt})`);
if (mode === "check") process.exit(0);
if (bal < ETH_LIQ + parseEther("0.0008")) { console.error("Not enough ETH."); process.exit(1); }

const send = async (label: string, p: Promise<Hex>) => {
  const h = await p; const r = await pub.waitForTransactionReceipt({ hash: h, timeout: 120_000 });
  if (r.status !== "success") throw new Error(`${label} reverted: ${h}`);
  console.log(`  ✔ ${label} ${h}`); return r;
};
if ((await pub.getCode({ address: hook })) === undefined) {
  await send("deploy hook (CREATE2)", wallet.sendTransaction({ to: A.create2, data: concat([salt, initCode]), gas: 3_000_000n }));
} else console.log("  hook already deployed");
if ((await pub.getCode({ address: hook })) === undefined) throw new Error("hook code missing after deploy");

await send("approve Permit2", wallet.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [A.permit2, maxUint256] }));
await send("Permit2 → PositionManager", wallet.writeContract({ address: A.permit2, abi: permit2Abi, functionName: "approve", args: [token, A.positionManager, 2n ** 160n - 1n, Math.floor(Date.now() / 1000) + 3600] }));

const key_: PoolKey = { currency0: zeroAddress, currency1: token, fee: 3000, tickSpacing: 60, hooks: hook };
const sqrtPriceX96 = 1000n * 2n ** 96n, liquidity = ETH_LIQ * 1000n;
const KEY_T = { type: "tuple", components: [{ name: "currency0", type: "address" }, { name: "currency1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" }] } as const;
const actions = encodePacked(["uint8", "uint8", "uint8"], [0x02, 0x0d, 0x14]);
const params = [
  encodeAbiParameters([KEY_T, { type: "int24" }, { type: "int24" }, { type: "uint256" }, { type: "uint128" }, { type: "uint128" }, { type: "address" }, { type: "bytes" }], [key_, -887220, 887220, liquidity, (ETH_LIQ * 105n) / 100n, (liquidity * 1000n * 105n) / 100n, account.address, "0x"]),
  encodeAbiParameters([{ type: "address" }, { type: "address" }], [zeroAddress, token]),
  encodeAbiParameters([{ type: "address" }, { type: "address" }], [zeroAddress, account.address]),
];
const unlock = encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, params]);
const pmAbi = [
  { type: "function", name: "initializePool", stateMutability: "payable", inputs: [{ name: "key", ...KEY_T }, { name: "sqrtPriceX96", type: "uint160" }], outputs: [{ type: "int24" }] },
  { type: "function", name: "modifyLiquidities", stateMutability: "payable", inputs: [{ name: "unlockData", type: "bytes" }, { name: "deadline", type: "uint256" }], outputs: [] },
  { type: "function", name: "multicall", stateMutability: "payable", inputs: [{ name: "data", type: "bytes[]" }], outputs: [{ type: "bytes[]" }] },
] as const;
const calls = [encodeFunctionData({ abi: pmAbi, functionName: "initializePool", args: [key_, sqrtPriceX96] }), encodeFunctionData({ abi: pmAbi, functionName: "modifyLiquidities", args: [unlock, BigInt(Math.floor(Date.now() / 1000) + 1800)] })];
await send("init hooked pool + add liquidity", wallet.writeContract({ address: A.positionManager, abi: pmAbi, functionName: "multicall", args: [calls], value: (ETH_LIQ * 105n) / 100n }));

const id = poolId(key_);
const [slot0, liq] = await Promise.all([pub.readContract({ address: A.stateView, abi: stateViewAbi, functionName: "getSlot0", args: [id] }), pub.readContract({ address: A.stateView, abi: stateViewAbi, functionName: "getLiquidity", args: [id] })]);
console.log(`  pool ${id}\n  tick ${slot0[1]} liquidity ${liq}`);
if (!RPC.includes("robinhood.com")) { console.error("Refusing to write deployedHook.ts from a non-Robinhood RPC."); process.exit(1); }
writeFileSync(ROOT + "src/lib/deployedHook.ts", `// Written by scripts/deploy-hook.mts (${new Date().toISOString()}). Real Robinhood TESTNET deploy of PrivoraGuardHook + hooked ETH/tWIF pool.
export interface DeployedHook {
  chainId: number;
  hook: string;
  maxMoveBps: number;
  fee: number;
  tickSpacing: number;
  poolId: string;
}
export const DEPLOYED_HOOK: DeployedHook | null = ${JSON.stringify({ chainId: 46630, hook, maxMoveBps: Number(MAX_MOVE_BPS), fee: 3000, tickSpacing: 60, poolId: id }, null, 2)};
`);
console.log("wrote src/lib/deployedHook.ts");
