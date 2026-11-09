import { getAddress, isAddress } from "viem";
import { CHAIN } from "./ethereum/chains";
import { readClient } from "./ethereum/read-client";
import { erc20Abi } from "./uniswap/abis";
import type { Token } from "./tokenList";

export { ETH, FEATURED_TOKENS, DEFAULT_TOKENS, sameToken, type Token } from "./tokenList";

const clean = (s: string) => s.replace(/[^\x20-\x7E]/g, "").slice(0, 16) || "?";

/** Reads + validates token metadata from chain (through the active read transport). */
export async function lookupToken(input: string): Promise<Token> {
  if (!isAddress(input)) throw new Error("Not a valid address");
  const address = getAddress(input);
  // One batched request (Multicall3): symbol, name, decimals. Anything that is not an ERC-20 fails to decode.
  const [symbol, name, decimals] = await readClient
    .multicall({
      multicallAddress: CHAIN.multicall3,
      allowFailure: false,
      contracts: [
        { address, abi: erc20Abi, functionName: "symbol" },
        { address, abi: erc20Abi, functionName: "name" },
        { address, abi: erc20Abi, functionName: "decimals" },
      ],
    })
    .catch(() => {
      throw new Error("Not a standard ERC-20 contract on " + CHAIN.name);
    });
  if (decimals > 36) throw new Error("Unreasonable decimals");
  return { address, symbol: clean(symbol), name: clean(name), decimals };
}
