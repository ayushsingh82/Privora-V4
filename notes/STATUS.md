# STATUS — single source of truth (done vs pending)

Project: **Privora v4** — Uniswap v4 swaps on Robinhood Chain testnet (46630) with every chain read through Anon-RPC. Hackathon: World is Flat, **submissions close 12 Nov 2026 17:30 UTC**.
Repo: `~/Desktop/wif-hackathon/privora-v4` (git initialised on `main`, **nothing committed, no remote**). Details: `00-PLAN.md`, `01-findings.md`. Last updated: 2026-11-09 (round 5). **What I need from you: `NEEDS-FROM-YOU.md`.**

## DONE (verified)
- [x] Chain facts: Robinhood testnet 46630 / mainnet 4663, RPCs, faucet, v4 contract addresses (code present on both nets).
- [x] Testnet has ≥36,629 v4 pools; 120/200 newest no-hook ETH pools have liquidity; curated GLD, SPY, OPEN2.
- [x] v4 reads work on-chain: StateView `getSlot0/getLiquidity`, V4Quoter `quoteExactInputSingle`.
- [x] Anon-RPC (Nox) reaches the testnet RPC: chainId, blockNumber, getCode via the worker.
- [x] Port V2 → v4 (chains, ABIs, pool key/id, curated pools, sqrtPrice math, Quoter hook, Permit2 state, Universal Router calldata, swap card, pools page, wallet add-chain).
- [x] Pool id computed in code == on-chain id (unit test).
- [x] **ETH → token** swap calldata simulated on the real Universal Router (`eth_call` + state override): GLD, SPY, OPEN2 all succeed (`notes/data/probe-sim-swap.mts`).
- [x] **token → ETH** swap through ERC-20→Permit2→router simulated (state overrides for balance/allowances): GLD, SPY, OPEN2 all succeed (`notes/data/probe-sim-sell.mts`).
- [x] `tsc` clean, `next build` OK, **12/12 unit tests**.
- [x] Real-browser e2e `npm run e2e:v4`: worker ready → pools via StateView → quote "1 ETH ≈ 0.547182 GLD" via Anon-RPC → anonymised reads 3, **direct reads 0**.
- [x] UI branding = Privora; copy updated V2→v4 / Robinhood testnet; Privacy Center screenshot checked (renders).
- [x] Docs: README (v4), `docs/DEMO_SCRIPT.md`, `docs/SUBMISSION.md`, V2 docs archived in `docs/v2-archive/`, notes + probe scripts.

- [x] **Real signed swaps on a local anvil fork of the testnet** (`scripts/fork-swap-test.mts`): ETH→tWIF and tWIF→ETH (Quoter → Permit2 → Universal Router) with the app's own calldata builder; received amounts == quoted amounts.
- [x] **Test $WIF**: `contracts/src/TestWIF.sol` (minimal ERC-20, 1B supply, NOT the real token) + `scripts/deploy-testwif.mts` (keygen / check / deploy: token → Permit2 approvals → `PositionManager.multicall([initializePool, MINT_POSITION+SETTLE_PAIR+SWEEP])`). **Full deploy verified on the fork** (pool init at tick 138162, liquidity 2e19). Writes `src/lib/deployed.ts` (guard refuses fork/local RPC). App shows tWIF first automatically once deployed.
- [x] Real $WIF researched: mainnet-only (0x5173…4773), its WIF/ETH v4 pool is **hooked (Pons hook)**, so not used as-is. See 01-findings.md round 5.
- [x] UI: "Before you swap" readiness box (Anon-RPC ready → wallet → network (auto add-chain) → testnet ETH with faucet button), disappears when all green.

## PENDING
**Needs the user (I can't do these)**
- [ ] **Fund the deployer** (faucet) → I run the real tWIF deploy. Then **real wallet swap** in the browser: ETH→tWIF, tWIF→ETH. (Both legs already proven on the fork; real chain/wallet not yet.)
- [ ] Hackathon submission details: judging criteria + how to submit are not on the site → ask Discord (discord.com/invite/PjXcRJ2uYY) / X @WIFonRH.
- [ ] Publish: create GitHub repo + push (nothing is committed or pushed), deploy (e.g. Vercel), record demo video, fill the 3 placeholders in `docs/SUBMISSION.md`.

**Can do next (me)**
- [ ] Commit the repo (on request).
- [ ] Measure latency over several runs; test tor-js / nym on the testnet RPC (only Nox tested).
- [ ] Swap UX: show gas estimate, token→token via ETH hop, more curated pools, handle `429` rate limits from the RPC gracefully.
- [ ] Liquidity (v4 positions via PositionManager) — currently a placeholder page.
- [ ] Optional hooks-track hook (Foundry is installed at ~/.foundry; solc will download on first build): needs CREATE2 address mining + pool init + deploy; only worth it if the wallet test passes.

## Known limits / risks
- Writes are public (wallet-signed) — stated in the UI.
- Curated ETH⇄token pools only; many other pools are junk/illiquid; ~91% of pools have hooks (could block or tax swaps).
- Nox boot was ~3–4 s in the single run measured; public mixnets can have bad minutes (app retries/fails over, stays fail-closed).
- Testnet RPC: 403 for Python's default User-Agent (use curl; don't spoof), 429 on 100-call batches, `getLogs` ≤ 10M blocks.
- Port 3200 is used by something else on this machine; use 3217 and `localhost` (not 127.0.0.1) with `next dev`.

## Update (pre-commit cleanup)
- Stale V2 scripts (e2e-anon, e2e-sepolia, e2e-tx, e2e-ui, screenshots) moved to `docs/v2-archive/scripts/`; their npm scripts removed.
- tsc clean, tests pass, `next build` OK, no `PRIVATE_KEY=0x` secrets in the tree (only doc mentions).
- Remaining work needs the user: faucet ETH -> deploy tWIF, wallet swap, GitHub URL, demo video, organizer answers.
