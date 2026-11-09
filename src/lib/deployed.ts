// Written by `scripts/deploy-testwif.mts` after a REAL testnet deploy of the test $WIF token + its ETH/tWIF v4 pool.
// null = not deployed yet (the app then only shows the existing testnet pools). Never commit a fork/local address here.
export interface Deployed {
  chainId: number;
  token: string;
  fee: number;
  tickSpacing: number;
  poolId: string;
}
export const DEPLOYED: Deployed | null = null;
