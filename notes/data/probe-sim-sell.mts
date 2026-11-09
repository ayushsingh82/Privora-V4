// Simulates token → ETH on the real Universal Router with eth_call + state overrides (fake balance, ERC-20→Permit2 allowance,
// Permit2→router allowance for a dummy account). usage: node --no-warnings notes/data/probe-sim-sell.mts 0
import { encodeAbiParameters, encodeFunctionData, keccak256, pad, toHex, decodeFunctionResult, type Hex } from "viem";
import { execFileSync } from "node:child_process";
import { encodeExactInSingle, keyFor, CURATED } from "../../src/lib/uniswap/v4.ts";
import { erc20Abi, universalRouterAbi } from "../../src/lib/uniswap/abis.ts";

const R = "https://rpc.testnet.chain.robinhood.com";
const U = "0x1111111111111111111111111111111111111111";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3", ROUTER = "0x8876789976decbfcbbbe364623c63652db8c0904";
const pool = CURATED[Number(process.argv[2] ?? 0)];
const token = pool.token.address;
const AMT = 10n ** 17n;

function rpc(call: object, overrides: object): { result?: string; error?: { message: string; data?: string } } {
  execFileSync("sleep", ["1.3"]);
  const out = execFileSync("curl", ["-s", "-m", "30", "-X", "POST", "-H", "content-type: application/json", "--data",
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [call, "latest", overrides] }), R]).toString();
  return JSON.parse(out);
}
const slotMap1 = (key: Hex, slot: bigint) => keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [key as `0x${string}`, slot]));
const slotMap2 = (inner: Hex, key: Hex) => keccak256(encodeAbiParameters([{ type: "address" }, { type: "bytes32" }], [key as `0x${string}`, inner]));
const word = (n: bigint) => pad(toHex(n), { size: 32 });

// 1) find the ERC-20 balance slot and allowance slot (OpenZeppelin-style mappings)
let balSlot: bigint | null = null, alwSlot: bigint | null = null;
for (let s = 0n; s < 12n && balSlot === null; s++) {
  const r = rpc({ to: token, data: encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [U] }) }, { [token]: { stateDiff: { [slotMap1(U, s)]: word(AMT) } } });
  if (r.result && BigInt(r.result) === AMT) balSlot = s;
}
for (let s = 0n; s < 12n && alwSlot === null; s++) {
  const slot = slotMap2(slotMap1(U, s), PERMIT2);
  const r = rpc({ to: token, data: encodeFunctionData({ abi: erc20Abi, functionName: "allowance", args: [U, PERMIT2] }) }, { [token]: { stateDiff: { [slot]: word(AMT) } } });
  if (r.result && BigInt(r.result) === AMT) alwSlot = s;
}
console.log("balance slot:", balSlot, "allowance slot:", alwSlot);
if (balSlot === null || alwSlot === null) { console.log("could not find ERC-20 storage layout; cannot simulate"); process.exit(2); }

// 2) Permit2.allowance[owner][token][spender] at base slot 1: amount(160) | expiration(48)<<160 | nonce(48)<<208
const exp = BigInt(Math.floor(Date.now() / 1000) + 1800);
const p2slot = slotMap2(slotMap2(slotMap2(word(1n), U), token), ROUTER); // allowance[owner][token][spender], base slot 1
const packed = AMT | (exp << 160n);

const { commands, inputs } = encodeExactInSingle({ key: keyFor(pool), zeroForOne: false, amountIn: AMT, minOut: 1n });
const data = encodeFunctionData({ abi: universalRouterAbi, functionName: "execute", args: [commands, inputs, exp] });
const r = rpc({ from: U, to: ROUTER, data }, {
  [U]: { balance: "0xde0b6b3a7640000" },
  [token]: { stateDiff: { [slotMap1(U, balSlot)]: word(AMT), [slotMap2(slotMap1(U, alwSlot), PERMIT2)]: word(AMT) } },
  [PERMIT2]: { stateDiff: { [p2slot]: word(packed) } },
});
console.log(r.error ? `REVERT/ERR: ${r.error.message} ${r.error.data ?? ""}` : `OK result=${r.result}  (token→ETH swap of 0.1 ${pool.token.symbol} executes without revert)`);
