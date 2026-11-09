# Test report

Run date: 2026-11-06 · macOS · Node 24.22 · Chrome (headless, throwaway profile) · Sepolia · Nox network.

## Latest full run (all suites, after the Privora rename, Settings page and UI polish)

| Suite | Command | Result |
| --- | --- | --- |
| Unit | `npm test` | **9/9 pass** |
| Typecheck | `npm run typecheck` | clean |
| Production build | `npm run build` | success (7 routes, static) |
| Anon-RPC e2e (real worker, real mixnet) | `npm run e2e` | **7/7 steps pass** |
| UI e2e (real Chrome) | `npm run e2e:ui` | **8/8 steps pass** |
| Wallet-signed tx e2e (anvil Sepolia fork) | `npm run e2e:tx` | **4/4 steps pass** |

`npm run e2e:ui` covers: every route renders with no console errors and **no horizontal overflow at 1280 px and 390 px**;
brand (title, logo, no leftover old name); header navigation; mode toggle banner/indicator; Settings persisting across a
full reload and reaching the swap card; the Connect-wallet button state; token selector filtering and validation.

## Automated (detail)

| Suite | Command | Result |
| --- | --- | --- |
| Unit: settings store (works without localStorage)  | `npm test` | pass |
| Unit: V2 math (UniswapV2Library vector, impact, min-out, quote) | `npm test` | 5/5 pass |
| Unit: fail-closed (anon mode, no worker ⇒ `PrivacyError`, **0 `fetch` calls**, failure logged as `anon`) | `npm test` | pass |
| Unit: direct mode explicit, logged `direct`, counted separately | `npm test` | pass |
| Unit: log contains only `{id,ts,method,transport,ok,ms,error}` (no params) | `npm test` | pass |
| Typecheck | `npm run typecheck` | clean |
| Production build | `npm run build` | success (5 routes static) |
| Lint | — | **not configured**; no ESLint run |
| **Real-browser e2e** | `npm run e2e` | **8/8 steps, two consecutive full passes** (final) |

### e2e steps (real worker, real network, headless Chrome)

1. Anon-RPC worker boots (hash-pinned load) → status `ready` (3.5–12 s).
2. Pools page loads real V2 pairs through Anon-RPC.
3. Privacy Center: anonymised reads > 0, **direct reads = 0**, `eth_call / Anon-RPC / Success` rows.
4. Swap quote for Sepolia pair #311 via Anon-RPC: **1 WETH ≈ 1.458873 MTK** — equals the direct-RPC result
   (`getAmountsOut(1e12)` = 1.458873463888e12) from an independent check; direct reads still 0.
5. Standard mode generates `Direct RPC` rows.
6. Fail-closed: kill worker ⇒ "Anon-RPC unavailable" banner, direct-read counter unchanged (no silent fallback).
7. Restart worker recovers.

### Flakiness disclosed

Earlier runs failed intermittently, for real reasons:
- Network outage on the developer machine (all requests failed with `NoTunnelExitError`).
- Nox exits that offer TLS tunnels are scarce (`tls.exit.skipped` in worker logs): some sessions got none.
  Mitigations added (queue, retry, restart self-heal, Multicall3 batching) and then two clean consecutive passes.
  Expect occasional failures on the public mixnet; the app surfaces them as visible errors with Retry.
- A bug in the test itself (selector matched the header "Swap" link) — fixed.
- Other networks: tor-js did not boot within 150 s (demo gateway); Nym booted in ~36 s but reads timed out (~24 s).

## Wallet-signed transactions — `npm run e2e:tx` (anvil fork of Sepolia, real UI, Standard mode)

The real app is built against a local anvil fork (`NEXT_PUBLIC_RPC_URL_SEPOLIA=http://127.0.0.1:8545`) and driven in
headless Chrome. The wallet is a **test-only EIP-1193 stub injected by the test script** that forwards to anvil's
unlocked dev account; the app code is unchanged. No real network or funds are involved.

| Step | Result |
| --- | --- |
| Swap ETH → token (`swapExactETHForTokens`), token balance verified onchain | pass |
| Approve exact amount (allowance verified == 50e18, **not unlimited**) + sell token → ETH | pass |
| Add liquidity ETH + token (auto-paired amount, approve, `addLiquidityETH`), LP tokens verified onchain | pass |
| Remove 50% (LP approve + `removeLiquidityETH`), LP balance halved onchain | pass |

Bugs this found and fixed (all real, user-facing): success status vanished instantly after a swap; fee-on-transfer
("taxed", here 20%) tokens reverted with `UniswapV2: K` → now simulated first and routed to the router's
`SupportingFeeOnTransferTokens` variants; out-of-gas on tokens with extra transfer logic → gas now estimated via the
read path with a 30% buffer. Doomed transactions are no longer sent to the wallet.

Limitation: the fork test runs in Standard mode (the mixnet exit cannot reach localhost). Anonymised reads and
wallet-signed writes are each tested, but not in the same run against a public network.

## Not tested (be honest)

| Area | Status |
| --- | --- |
| A real browser wallet extension (MetaMask/Rabby) | Only a stub EIP-1193 provider was used; real-extension prompts/network switching not exercised |
| ERC-20 → ERC-20 swaps and non-ETH `addLiquidity`/`removeLiquidity` | Same code path family, but not executed in tests (ETH-pair flows were) |
| Public-network transactions | Not run; fork only |
| Mobile layout | Automated overflow check at 390 px on every route plus screenshots; no real-device testing |
| Mainnet | Contract addresses verified onchain; no UI run on mainnet |
| Anon-RPC network anonymity properties | Out of scope: we test routing/transport, not the network's guarantees |
