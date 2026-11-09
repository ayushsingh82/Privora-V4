// Prints Universal Router calldata for an ETH→token exact-in swap on curated pool N (arg1). Used with eth_call + state override.
// usage: node --no-warnings notes/data/probe-sim-swap.mts 0
import { encodeFunctionData } from "viem";
import { encodeExactInSingle, keyFor, CURATED } from "../../src/lib/uniswap/v4.ts";
import { universalRouterAbi } from "../../src/lib/uniswap/abis.ts";
const i = Number(process.argv[2] ?? 0);
const { commands, inputs } = encodeExactInSingle({ key: keyFor(CURATED[i]), zeroForOne: true, amountIn: 10n ** 15n, minOut: 1n });
console.log(encodeFunctionData({ abi: universalRouterAbi, functionName: "execute", args: [commands, inputs, BigInt(Math.floor(Date.now() / 1000) + 1800)] }));
