# 3-minute demo (Robinhood Chain testnet)

**Prereqs:** Chrome with MetaMask (or similar), on Robinhood Chain Testnet (46630) with at least 0.002 testnet ETH from https://faucet.testnet.chain.robinhood.com. Open the live app **https://privora-v4.vercel.app/** (or run locally: `npx next build && npx next start -p 3217`, then use `http://localhost:3217`, not 127.0.0.1). Do one dry run before recording.

**Amounts:** the demo pools are tiny. Use **0.00005 ETH** for the swap that should work, and **0.001 ETH** for the one the hook should block.

| Time | Step | What to say and do |
| --- | --- | --- |
| 0:00 | **Landing** | "Every dapp read is a request from your IP to an RPC company: this IP cares about this wallet and this pool." Click *Launch App*. |
| 0:20 | **Anon-RPC ready** | The sidebar shows `Anon-RPC active` once the worker boots (a few seconds). Connect the wallet; the app adds or switches to Robinhood Chain Testnet. The "Before you swap" checklist turns green and disappears. |
| 0:40 | **Pools** | Open *Pools*: real **Uniswap v4** pools with price, liquidity and tick, read from StateView *through the mixnet*. Point at the green **Privora Guard hook** badge on the ETH/tWIF pool: "this pool uses our own v4 hook". |
| 1:00 | **Swap quote** | On *Swap*, pick ETH → **tWIF·Guard**, type `0.00005`: quote from the on-chain **V4Quoter** (about 48 tWIF), price impact, min received. Point at the line under the button: reads anonymised, writes not. |
| 1:25 | **Swap** | Click *Swap*, confirm in the wallet (simulated first via the read path; sent by the wallet, so public). The tx link appears and the receipt is polled over Anon-RPC. |
| 1:50 | **Hook step: the guard blocks a big swap** | Change the amount to `0.001`. The quote is rejected with **"Blocked by the pool's Privora Guard hook: this swap would move the price by more than 10%"**. Say: "Our v4 hook reverts any single swap that moves a thin pool's price by more than 10%, so users never get a terrible fill." Optional contrast: switch the output to plain **tWIF** with the same `0.001`; that pool has no hook and quotes about 831 tWIF, a roughly 17% price impact. |
| 2:05 | **Liquidity (optional, 15 s)** | Open *Liquidity*, pick ETH / tWIF · Guard, type `0.0001`: the paired tWIF amount fills in from the pool price. Say: "Anyone can deepen the pool; same private reads." Don't submit unless you have time (it needs two approvals first). Proof is on the explorer: tx `0x7db52a8e749e00f4dbb0f38be14cb7561b92e1a0d9b1dce0d3d9a6f0ab2dd6a6`. |
| 2:15 | **Privacy Center** | Open *Privacy*: rows `eth_call … Anon-RPC … Success`, "Anonymised reads" climbs, **Direct reads = 0**. Toggle *Standard* to show rows flip to **Direct RPC**, then back. |
| 2:40 | **Fail-closed** | *Kill worker*: red banner, reads blocked, direct counter doesn't move. |
| 2:55 | **Close** | "Private reads, real Uniswap v4, plus a custom hook. Code and README: github.com/ayushsingh82/Privora-V4." |

**Proof you can show quickly (optional):** on the explorer (https://explorer.testnet.chain.robinhood.com) open the hook `0x4959cB5a32a0887EAe43839722C79709Abe580C0` to show it is a deployed contract. After your swap its `swapCount` for the pool is 1.

**Backup if the mixnet is slow:** Privacy → pick another network (tor-js / nym), or show the recorded e2e output (`npm run e2e:v4`).
**Backup if the wallet swap fails:** show the quote, the blocked message and the Privacy Center, then explain the swap was verified by simulation and on a fork (`scripts/fork-swap-test.mts`).

**Pre-flight checklist (2 minutes before recording)**
1. Wallet on Robinhood Chain Testnet (46630) with at least 0.001 ETH and some tWIF (the test wallet already holds tWIF).
2. Open https://privora-v4.vercel.app/ in a fresh Chrome window, hide bookmarks, zoom 110%.
3. Wait for `Anon-RPC active` in the sidebar before connecting.
4. Do one full dry run of 0.00005 ETH → tWIF·Guard so the Permit2 and wallet popups are warm.
5. Keep these tabs ready: the explorer pages for the hook and the buy tx `0x400b4fb4d246cd0ce21c1dcc80d63268f92318c32f72c60d87f28274e55c2746` (the README "Live testnet proof" section lists all of them).
