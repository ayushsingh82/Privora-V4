// Written by scripts/deploy-hook.mts (2026-11-11T02:55:21.948Z). Real Robinhood TESTNET deploy of PrivoraGuardHook + hooked ETH/tWIF pool.
export interface DeployedHook {
  chainId: number;
  hook: string;
  maxMoveBps: number;
  fee: number;
  tickSpacing: number;
  poolId: string;
}
export const DEPLOYED_HOOK: DeployedHook | null = {
  "chainId": 46630,
  "hook": "0x4959cB5a32a0887EAe43839722C79709Abe580C0",
  "maxMoveBps": 1000,
  "fee": 3000,
  "tickSpacing": 60,
  "poolId": "0xdfe9df157fe7b6be66617a6e2f3e333aa21fa260c2c8b4f8c24ba8a5fef64026"
};
