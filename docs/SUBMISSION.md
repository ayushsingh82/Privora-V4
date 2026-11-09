# Submission — Privora (World is Flat hackathon)

**One line:** Private reads for Uniswap v4 on Robinhood Chain: swap with the real v4 contracts while every chain read goes through Anon-RPC, so your RPC provider never sees your IP next to your wallet.

**Track:** hooks and defi (Uniswap v4 integration); also fits tools and infra.

**Problem:** every balance, allowance, pool and quote read is a request from your IP to an RPC provider, linking network identity to wallet before you sign anything.

**What we built:** a Next.js app on Robinhood Chain testnet (46630). Quotes from V4Quoter, pool state from StateView, swaps via the Universal Router with Permit2. All reads go through `@anon-rpc/browser-harness` (hash-pinned sandboxed worker on a mixnet), fail-closed with a live request log and a 0-direct-reads counter.

**Honest limits:** transactions are public (wallet-signed); curated ETH⇄token pools only; no liquidity UI; not a custom hook.

**Proof:** `npm run e2e:v4` (real Chrome: worker ready → v4 pools + Quoter quote via Anon-RPC → direct reads 0). On-chain simulations of ETH→token and token→ETH (with Permit2) in `notes/data/`.

**Repo:** (add URL) · **Demo video:** (add) · **Deployed URL:** (add)
