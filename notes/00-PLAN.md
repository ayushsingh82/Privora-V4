# Privora v4 — plan

**Product:** Privora = a Uniswap **v4** swap UI where every chain read goes through **Anon-RPC** (private reads), demoed on **Robinhood Chain testnet (46630)** for the World is Flat hackathon (deadline 12 Nov 2026 17:30 UTC). UI brand stays "Privora". Read `01-findings.md` first for verified addresses/probes.

## Scope (what ships)
1. **Swap (core):** ETH ⇄ token on curated, funded, no-hook v4 pools (GLD, SPY, OPEN2…). Quote = on-chain V4Quoter via Anon-RPC. Execute = Universal Router `execute` with `V4_SWAP` (+ Permit2 for ERC-20 input). Writes go through the wallet (public, not anonymised) — said clearly in the UI.
2. **Pools page:** curated v4 pools, state from StateView (`getSlot0`, `getLiquidity`) through Anon-RPC.
3. **Privacy Center / Settings:** unchanged logic (log of every request + transport), updated chain + contract info.
4. **Liquidity:** NOT in v1 (v4 positions = PositionManager NFTs + ticks). Page shows a "coming soon" note. Stretch only.
5. **Stretch (hooks track):** a tiny custom hook (e.g. a "privacy/anon-read" or fee hook) deployed on testnet — needs CREATE2 address-flag mining. Only if swap + pools are solid.

## Architecture changes vs V2 Privora
| V2 | v4 |
|---|---|
| factory/router/WETH in `chains.ts` | `poolManager, stateView, quoter, universalRouter, permit2, positionManager`; no WETH (native ETH = currency `0x0`) |
| `getPair/getReserves` | pool id = `keccak256(abi.encode(PoolKey))`; StateView `getSlot0/getLiquidity` |
| `router.getAmountsOut` | `V4Quoter.quoteExactInputSingle` (via `eth_call`) |
| ERC-20 `approve(router)` | `approve(Permit2)` then `Permit2.approve(token, UniversalRouter, amt, exp)` |
| router swap fns | `UniversalRouter.execute(0x10, [abi.encode(actions=0x06,0x0c,0x0f, params)], deadline)` |
| constant-product math | `sqrtPriceX96` spot price for impact |

Actions (v4-periphery): `SWAP_EXACT_IN_SINGLE=0x06`, `SETTLE_ALL=0x0c`, `TAKE_ALL=0x0f`. Universal Router command `V4_SWAP=0x10`.

## Milestones
- [x] M0 Verify chain/contracts/liquidity/Quoter/Anon-RPC (see 01-findings.md)
- [x] M1 Core port: chains, abis, tokens, curated pools, pricing, hooks (tsc clean, 12 unit tests pass)
- [x] M2 Swap card v4 written (ETH→token simulated OK on-chain; token→ETH + Permit2 path coded but NOT yet simulated/sent)
- [x] M3 Pools page + settings/marketing/pitch text updated to v4 + Robinhood testnet (liquidity page = placeholder)
- [x] M4 `npm test` 12/12, `tsc` clean, `next build` OK, real-browser e2e `scripts/e2e-v4.mts` passes (see 01-findings.md round 3)
- [~] M5 Test $WIF deploy + swaps verified on anvil fork; **real testnet deploy + wallet swap wait on faucet ETH** (see NEEDS-FROM-YOU.md)
- [ ] M6 Demo script, README, submission text (+ optional hook)

## Risks / open (also in 01-findings.md)
- Wallet swap not yet proven on-chain (needs testnet ETH). Simulation via `eth_call` first.
- Nox boot latency; keep the number of reads per screen small (Multicall3 is present at 0xcA11…CA11 on testnet).
- Testnet RPC: 403 for Python UA (use curl), 429 on big batches, `getLogs` ≤10M blocks.
- Hackathon rules/criteria not public: ask Discord.

## Working rules
- Keep appending findings to `notes/01-findings.md`; update checkboxes here.
- Dev server: use `localhost` (not 127.0.0.1), port ≠ 3200 (taken by something else), kill by PID.
- Don't spoof user agents; don't `pkill next-server`.
