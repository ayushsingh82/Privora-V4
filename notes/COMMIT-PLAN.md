# Commit plan (12 commits, 15 min apart, push after each, no co-author)

Remote: https://github.com/ayushsingh82/Privora-V4.git (branch main)

| # | Message | Files |
|---|---|---|
| 1 | chore: scaffold Next.js 16 app, tooling and licence | package*.json, tsconfig, next/postcss config, .gitignore, .env.example, LICENSE, AGENTS.md |
| 2 | feat(anon-rpc): fail-closed worker manager and settings | src/lib/anon-rpc, errors, settings, read-client |
| 3 | feat(chain): Robinhood Chain config, wallet, tx, v4 ABIs | ethereum/chains, wallet, tx, uniswap/abis |
| 4 | feat(uniswap): pool key, router encoding, price math, token list | uniswap/v4, pricing (+tests), tokenList, tokens, deployed, public/tokens |
| 5 | feat(read): Quoter/StateView/Permit2 hooks, curated pools | hooks.ts, pools.ts |
| 6 | feat(ui): app shell, Robinhood theme, logo, privacy indicators | layout, globals, AppShell, shared components |
| 7 | feat(ui): readiness checklist | swap/Readiness |
| 8 | feat(swap): swap via Universal Router + Permit2 | SwapCard, SlippageButton, swap page |
| 9 | feat(pools): pools, privacy centre, settings, liquidity placeholder | PoolCard, (app) pages |
| 10 | feat(site): marketing, pitch, footer wordmark | (marketing), pitch, art/marketing components |
| 11 | feat(contracts): test WIF, deploy, fork test, e2e, probes | contracts, scripts, notes/data |
| 12 | docs: README with diagrams, demo script, submission, notes | README, docs, notes |

Not committed: `docs/images/` (old V2 screenshots), `.env.local`, build output.
Runner: scratchpad `commits.sh` (GAP=900s). After the real tWIF deploy, a follow-up commit adds the real `src/lib/deployed.ts`.
