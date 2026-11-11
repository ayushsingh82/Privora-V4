// Written by scripts/deploy-testwif.mts (2026-11-11T02:49:31.830Z). Real Robinhood TESTNET deploy of the test $WIF token + pool.
export interface Deployed {
  chainId: number;
  token: string;
  fee: number;
  tickSpacing: number;
  poolId: string;
}
export const DEPLOYED: Deployed | null = {
  "chainId": 46630,
  "token": "0x36b31eb911039f449cef6e775f253fabad1db701",
  "fee": 3000,
  "tickSpacing": 60,
  "poolId": "0x7c83287a7325a4f46c734ef4e1af03d6e06237ddbcbc04e2d89ec376a482b6f4"
};
