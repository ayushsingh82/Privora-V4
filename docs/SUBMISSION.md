# Submission — Privora (World is Flat hackathon)

**One line:** Private reads for Uniswap v4 on Robinhood Chain: swap with the real v4 contracts while every chain read goes through Anon-RPC, so your RPC provider never sees your IP next to your wallet.

**Track:** hooks and defi (Uniswap v4 integration); also fits tools and infra.

**Problem:** every balance, allowance, pool and quote read is a request from your IP to an RPC provider, linking network identity to wallet before you sign anything.

**What we built:** a Next.js app on Robinhood Chain testnet (46630). Quotes from V4Quoter, pool state from StateView, swaps via the Universal Router with Permit2. All reads go through `@anon-rpc/browser-harness` (hash-pinned sandboxed worker on a mixnet), fail-closed with a live request log and a 0-direct-reads counter.

**Extra, a custom v4 hook:** Privora Guard (`contracts/src/PrivoraGuardHook.sol`, deployed on testnet with a hooked ETH/tWIF pool): a swap that would move the price more than 10% reverts, protecting thin pools; the app shows it as "blocked" in the quote. Foundry tests plus an on-chain Quoter check are in the README.

**Honest limits:** transactions are public (wallet-signed); curated ETH⇄token pools only; liquidity page is full-range add only (no remove yet); the Guard hook has no third-party audit (it has 6 Foundry tests incl. a fuzz test, and a clean Slither run).

**Proof:** `npm run e2e:v4` (real Chrome: worker ready → v4 pools + Quoter quote via Anon-RPC → direct reads 0). On-chain simulations of ETH→token and token→ETH (with Permit2) in `notes/data/`.

**Repo:** https://github.com/ayushsingh82/Privora-V4 · **Demo video:** (add) · **Deployed URL:** https://privora-v4.vercel.app/
