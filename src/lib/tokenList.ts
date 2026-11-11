import { getAddress, zeroAddress, type Address } from "viem";
import { DEPLOYED } from "./deployed.ts";
import { DEPLOYED_HOOK } from "./deployedHook.ts";

export interface Token {
  address: Address; // zeroAddress = native ETH (v4 uses address(0) as the native currency)
  symbol: string;
  name: string;
  decimals: number;
  native?: boolean;
  /** Set when this entry stands for the pool that uses this v4 hook (same ERC-20, different pool). */
  hook?: Address;
}

export const ETH: Token = { address: zeroAddress, symbol: "ETH", name: "Ether", decimals: 18, native: true };

const t = (address: string, symbol: string, name: string): Token => ({ address: getAddress(address), symbol, name, decimals: 18 });

// Robinhood testnet tokens that have funded, hook-less ETH pools (see notes/01-findings.md, verified 2026-11-09).
// Anyone can create pools here, so the list is curated rather than scanned (getLogs is capped at 10M blocks).
/** Our own TEST $WIF (not the real token: that one is mainnet-only). Only present after scripts/deploy-testwif.mts ran for real. */
export const TWIF: Token | null = DEPLOYED ? { address: getAddress(DEPLOYED.token), symbol: "tWIF", name: "Test $WIF (demo only)", decimals: 18 } : null;

/** Same tWIF token, but routed through the hooked ETH/tWIF pool (PrivoraGuardHook). Only present after scripts/deploy-hook.mts ran for real. */
export const TWIF_GUARD: Token | null =
  TWIF && DEPLOYED_HOOK ? { ...TWIF, symbol: "tWIF·Guard", name: "Test $WIF via Privora Guard pool", hook: getAddress(DEPLOYED_HOOK.hook) } : null;

const GLD = t("0x10146876693685ea80e39b7a95628d7cdbf92b3f", "GLD", "Gold (Tesoro testnet)");
const SPY = t("0x74b9f211f1384825ee3d577005217591fc172ab4", "SPY", "S&P 500 ETF (Tesoro testnet)");
const OPEN2 = t("0x80bc2772d3b14b1e673bed96d486ab66b05e7f67", "OPEN2", "Snipe test OPEN2");

/** Featured pools: native ETH (currency0 = address(0)) vs a token, no hook. Pool params are part of the pool identity. */
export interface FeaturedPool { token: Token; fee: number; tickSpacing: number; hooks?: Address; maxMoveBps?: number }
export const FEATURED_POOLS: FeaturedPool[] = [
  ...(TWIF && DEPLOYED ? [{ token: TWIF, fee: DEPLOYED.fee, tickSpacing: DEPLOYED.tickSpacing }] : []),
  ...(TWIF_GUARD && DEPLOYED_HOOK ? [{ token: TWIF_GUARD, fee: DEPLOYED_HOOK.fee, tickSpacing: DEPLOYED_HOOK.tickSpacing, hooks: TWIF_GUARD.hook, maxMoveBps: DEPLOYED_HOOK.maxMoveBps }] : []),
  { token: GLD, fee: 3000, tickSpacing: 60 },
  { token: SPY, fee: 3000, tickSpacing: 60 },
  { token: OPEN2, fee: 10000, tickSpacing: 200 },
];
export const FEATURED_TOKENS: Token[] = FEATURED_POOLS.map((p) => p.token);
export const DEFAULT_TOKENS: Token[] = [ETH, ...FEATURED_TOKENS];

export const sameToken = (a: Token | null, b: Token | null) =>
  !!a && !!b && a.address.toLowerCase() === b.address.toLowerCase() && (a.hook ?? "").toLowerCase() === (b.hook ?? "").toLowerCase();


