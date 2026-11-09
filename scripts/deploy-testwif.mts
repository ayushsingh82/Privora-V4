// Deploys the TEST $WIF token (tWIF) on Robinhood testnet, then creates a hook-less ETH/tWIF Uniswap v4 pool and adds
// full-range liquidity through the PositionManager. Writes the result to src/lib/deployed.ts (read by the app).
//
//   DEPLOYER_PRIVATE_KEY in .env.local (testnet only!) — `node --no-warnings scripts/deploy-testwif.mts keygen` makes one.
//   RPC_URL=...        optional (default Robinhood testnet; use http://127.0.0.1:8545 for an anvil fork)
//   DEPLOY_OUT=path    optional output file (default src/lib/deployed.ts; use a temp path for fork tests)
//   ETH_LIQ=0.02       ETH to put in the pool (tWIF side: 1,000,000 tWIF per ETH)
//   node --no-warnings scripts/deploy-testwif.mts [keygen|check|deploy]
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, encodeAbiParameters, encodeFunctionData, encodePacked, formatEther, http, maxUint256, parseEther, zeroAddress, type Hex, type Address } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { keyFor, poolId, type PoolKey } from "../src/lib/uniswap/v4.ts";
import { permit2Abi, erc20Abi, stateViewAbi } from "../src/lib/uniswap/abis.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const ENV = ROOT + ".env.local";
const mode = process.argv[2] ?? "check";

const A = {
  positionManager: "0x58daec3116aae6d93017baaea7749052e8a04fa7",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  stateView: "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b",
} as const satisfies Record<string, Address>;
const RPC = process.env.RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";
const chain = defineChain({ id: 46630, name: "Robinhood Chain Testnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });

function readKey(): Hex | null {
  if (process.env.DEPLOYER_PRIVATE_KEY) return process.env.DEPLOYER_PRIVATE_KEY as Hex;
  if (!existsSync(ENV)) return null;
  const m = readFileSync(ENV, "utf8").match(/^DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$/m);
  return (m?.[1] as Hex) ?? null;
}

if (mode === "keygen") {
  if (readKey()) { console.log("DEPLOYER_PRIVATE_KEY already set; address:", privateKeyToAccount(readKey()!).address); process.exit(0); }
  const k = generatePrivateKey();
  appendFileSync(ENV, `\n# TESTNET-ONLY throwaway deployer key for scripts/deploy-testwif.mts. Never put real funds here.\nDEPLOYER_PRIVATE_KEY=${k}\n`);
  console.log("Created a throwaway TESTNET key in .env.local (gitignored). Fund this address from the faucet:\n  ", privateKeyToAccount(k).address);
  process.exit(0);
}

const key = readKey();
if (!key) { console.error("No DEPLOYER_PRIVATE_KEY. Run: node --no-warnings scripts/deploy-testwif.mts keygen"); process.exit(1); }
const account = privateKeyToAccount(key);
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ account, chain, transport: http(RPC) });

const ETH_LIQ = parseEther(process.env.ETH_LIQ ?? "0.02");
const GAS_RESERVE = parseEther("0.003");
const bal = await pub.getBalance({ address: account.address });
console.log(`deployer ${account.address}\nRPC ${RPC}\nbalance ${formatEther(bal)} ETH (need ≈ ${formatEther(ETH_LIQ + GAS_RESERVE)})`);
if (mode === "check") process.exit(0);
if (bal < ETH_LIQ + GAS_RESERVE) { console.error("Not enough ETH. Fund the deployer from the faucet or lower ETH_LIQ."); process.exit(1); }

const artifact = JSON.parse(readFileSync(ROOT + "contracts/out/TestWIF.sol/TestWIF.json", "utf8"));
const SUPPLY = 1_000_000_000n * 10n ** 18n;
const send = async (label: string, p: Promise<Hex>) => {
  const hash = await p;
  const r = await pub.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (r.status !== "success") throw new Error(`${label} reverted: ${hash}`);
  console.log(`  ✔ ${label} ${hash}`);
  return r;
};

// 1) token
const dep = await send("deploy tWIF", wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode.object as Hex, args: [SUPPLY] }));
const token = dep.contractAddress as Address;
console.log("  tWIF:", token);

// 2) approvals for the PositionManager (ERC-20 → Permit2, Permit2 → PositionManager)
await send("approve Permit2", wallet.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [A.permit2, maxUint256] }));
const exp = Math.floor(Date.now() / 1000) + 3600;
await send("Permit2 → PositionManager", wallet.writeContract({ address: A.permit2, abi: permit2Abi, functionName: "approve", args: [token, A.positionManager, 2n ** 160n - 1n, exp] }));

// 3) pool: ETH / tWIF, fee 0.3%, tickSpacing 60, no hook. Price: 1 ETH = 1,000,000 tWIF → sqrtPriceX96 = 1000 · 2^96.
const key_: PoolKey = { currency0: zeroAddress, currency1: token, fee: 3000, tickSpacing: 60, hooks: zeroAddress };
const sqrtPriceX96 = 1000n * 2n ** 96n;
const TICK_LOWER = -887220, TICK_UPPER = 887220; // full range (multiples of 60)
const liquidity = ETH_LIQ * 1000n; // full range at this price: amount0 ≈ L/1000, amount1 ≈ L·1000
const KEY_T = { type: "tuple", components: [{ name: "currency0", type: "address" }, { name: "currency1", type: "address" }, { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" }] } as const;
const actions = encodePacked(["uint8", "uint8", "uint8"], [0x02 /* MINT_POSITION */, 0x0d /* SETTLE_PAIR */, 0x14 /* SWEEP */]);
const amount0Max = (ETH_LIQ * 105n) / 100n, amount1Max = (liquidity * 1000n * 105n) / 100n;
const params = [
  encodeAbiParameters([KEY_T, { type: "int24" }, { type: "int24" }, { type: "uint256" }, { type: "uint128" }, { type: "uint128" }, { type: "address" }, { type: "bytes" }],
    [key_, TICK_LOWER, TICK_UPPER, liquidity, amount0Max, amount1Max, account.address, "0x"]),
  encodeAbiParameters([{ type: "address" }, { type: "address" }], [zeroAddress, token]),
  encodeAbiParameters([{ type: "address" }, { type: "address" }], [zeroAddress, account.address]),
];
const unlockData = encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, params]);
const pmAbi = [
  { type: "function", name: "initializePool", stateMutability: "payable", inputs: [{ name: "key", ...KEY_T }, { name: "sqrtPriceX96", type: "uint160" }], outputs: [{ type: "int24" }] },
  { type: "function", name: "modifyLiquidities", stateMutability: "payable", inputs: [{ name: "unlockData", type: "bytes" }, { name: "deadline", type: "uint256" }], outputs: [] },
  { type: "function", name: "multicall", stateMutability: "payable", inputs: [{ name: "data", type: "bytes[]" }], outputs: [{ type: "bytes[]" }] },
] as const;
const calls = [
  encodeFunctionData({ abi: pmAbi, functionName: "initializePool", args: [key_, sqrtPriceX96] }),
  encodeFunctionData({ abi: pmAbi, functionName: "modifyLiquidities", args: [unlockData, BigInt(Math.floor(Date.now() / 1000) + 1800)] }),
];
await send("init pool + add liquidity", wallet.writeContract({ address: A.positionManager, abi: pmAbi, functionName: "multicall", args: [calls], value: amount0Max }));

// 4) verify through StateView
const id = poolId(key_);
const [slot0, liq] = await Promise.all([
  pub.readContract({ address: A.stateView, abi: stateViewAbi, functionName: "getSlot0", args: [id] }),
  pub.readContract({ address: A.stateView, abi: stateViewAbi, functionName: "getLiquidity", args: [id] }),
]);
console.log(`  pool ${id}\n  sqrtPriceX96 ${slot0[0]} tick ${slot0[1]} liquidity ${liq}`);
const out = { chainId: 46630, token, symbol: "tWIF", name: "Test World is Flat", decimals: 18, fee: 3000, tickSpacing: 60, poolId: id, deployer: account.address, rpc: RPC.startsWith("http://127") ? "anvil-fork (not real)" : RPC };
const OUT = process.env.DEPLOY_OUT ?? ROOT + "src/lib/deployed.ts";
if (!process.env.DEPLOY_OUT && !RPC.includes("robinhood.com")) { console.error("Refusing to write src/lib/deployed.ts from a non-Robinhood RPC (fork/local). Set DEPLOY_OUT to a temp path."); process.exit(1); }
const ts = `// Written by scripts/deploy-testwif.mts (${new Date().toISOString()}). Real Robinhood TESTNET deploy of the test $WIF token + pool.
export interface Deployed {
  chainId: number;
  token: string;
  fee: number;
  tickSpacing: number;
  poolId: string;
}
export const DEPLOYED: Deployed | null = ${JSON.stringify({ chainId: 46630, token, fee: 3000, tickSpacing: 60, poolId: id }, null, 2)};
`;
writeFileSync(OUT, OUT.endsWith(".ts") ? ts : JSON.stringify(out, null, 2) + "\n");
console.log("wrote", OUT, out);
