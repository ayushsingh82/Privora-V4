# 2–3 minute demo (Robinhood Chain testnet)

Prereqs: build + start (`npx next build && npx next start -p 3217`), Chrome with MetaMask (or similar) and testnet ETH from https://faucet.testnet.chain.robinhood.com. Open **http://localhost:3217**.

1. **Landing (0:00)** — "Every dapp read is a request from your IP to an RPC company: this IP cares about this wallet and this pool." Click *Launch App*.
2. **Anon-RPC ready (0:20)** — Sidebar shows `Anon-RPC active` once the worker boots (a few seconds). Connect wallet; the app adds/switches to Robinhood Chain Testnet (46630).
3. **Pools (0:40)** — Real **Uniswap v4** pools (GLD, SPY, OPEN2) with price, liquidity and tick, read from StateView *through the mixnet*.
4. **Swap quote (1:00)** — ETH → GLD, type `0.001`: quote from the on-chain **V4Quoter**, price impact, min received. Point at the line under the button: reads anonymised, writes not.
5. **Privacy Center (1:30)** — Open *Privacy*: rows `eth_call … Anon-RPC … Success`, "Anonymised reads ✓" climbs, **Direct reads = 0**. Toggle *Standard* to show rows flip to **Direct RPC**, then back.
6. **Swap (2:00)** — Click *Swap*, confirm in wallet (simulated first via the read path; sent by the wallet — public). Tx link appears; the receipt is polled over Anon-RPC.
7. **Fail-closed (2:30)** — *Kill worker*: red banner, reads blocked, direct counter doesn't move.

Backup if the mixnet is slow: Privacy → pick another network (tor-js / nym) or show the recorded e2e output (`npm run e2e:v4`).
