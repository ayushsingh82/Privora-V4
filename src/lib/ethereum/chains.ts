// Centralised network + Uniswap v4 contract config. Robinhood Chain (Arbitrum Orbit L2). The v4 contracts are NOT at the
// canonical 0x…4444 PoolManager address here; these are the official Uniswap deployments for this chain
// (https://developers.uniswap.org/docs/protocols/v4/deployments). Verified: code present on both networks.
import { defineChain, type Address } from "viem";

export interface ChainConfig {
  id: number;
  name: string;
  rpc: string;
  explorer: string;
  poolManager: Address;
  stateView: Address;
  quoter: Address;
  universalRouter: Address;
  positionManager: Address;
  permit2: Address;
  multicall3: Address;
  nativeSymbol: string;
  testnet: boolean;
  faucet?: string;
}

const V4 = {
  poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
  stateView: "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b",
  quoter: "0x8dc178efb8111bb0973dd9d722ebeff267c98f94",
  universalRouter: "0x8876789976decbfcbbbe364623c63652db8c0904",
  positionManager: "0x58daec3116aae6d93017baaea7749052e8a04fa7",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
} as const satisfies Record<string, Address>;

const CHAINS: Record<number, ChainConfig> = {
  46630: {
    id: 46630,
    name: "Robinhood Chain Testnet",
    rpc: process.env.NEXT_PUBLIC_RPC_URL_TESTNET || "https://rpc.testnet.chain.robinhood.com",
    explorer: "https://explorer.testnet.chain.robinhood.com",
    nativeSymbol: "ETH",
    testnet: true,
    faucet: "https://faucet.testnet.chain.robinhood.com",
    ...V4,
  },
  4663: {
    id: 4663,
    name: "Robinhood Chain",
    rpc: process.env.NEXT_PUBLIC_RPC_URL_MAINNET || "https://rpc.mainnet.chain.robinhood.com",
    explorer: "https://robinhoodchain.blockscout.com",
    nativeSymbol: "ETH",
    testnet: false,
    ...V4,
  },
};

const wanted = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 46630);
export const CHAIN: ChainConfig = CHAINS[wanted] ?? CHAINS[46630];
export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);

/** viem chain object for the wallet client / wallet_addEthereumChain. */
export const VIEM_CHAIN = defineChain({
  id: CHAIN.id,
  name: CHAIN.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [CHAIN.rpc] } },
  blockExplorers: { default: { name: "Explorer", url: CHAIN.explorer } },
  contracts: { multicall3: { address: CHAIN.multicall3 } },
  testnet: CHAIN.testnet,
});
