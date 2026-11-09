# Privora v4 — findings log (keep appending; read this first)

Goal: Privora (anonymous reads via Anon-RPC) moved from Uniswap V2 to **Uniswap V4**, demoed on **Robinhood Chain testnet**, for the World is Flat hackathon (hooks-and-defi / tools-and-infra track). Base code copied from `../Privora` (V2, Next.js 16, viem, @anon-rpc/browser-harness 0.4.0).

## Hackathon facts (https://worldisflat.fun/build)
- Prize 10,000 USDG. Submissions close **12 Nov 2026 17:30 UTC**. Round one 12–14 Nov, final vote 14–16 Nov, winner 16 Nov.
- 8 tracks incl. **hooks and defi** (uniswap v4 hooks, vaults, pools, anything that moves value) — 7 projects only; tools and infra (8). Full notes: `../hackathon.md`.
- Criteria and submission method are not on the site: ask Discord (discord.com/invite/PjXcRJ2uYY) / X @WIFonRH.

## Robinhood Chain
| | Mainnet | Testnet |
|---|---|---|
| Chain ID | 4663 (0x1237) | 46630 (0xb626) |
| RPC | https://rpc.mainnet.chain.robinhood.com | https://rpc.testnet.chain.robinhood.com |
| Explorer | — | https://explorer.testnet.chain.robinhood.com |
| Faucet | — | https://faucet.testnet.chain.robinhood.com |
- Arbitrum Orbit L2. Testnet gas ticker thoodeth (ETH).
- RPC returns **403 to Python's default user agent**; plain `curl` works. Do NOT spoof a UA (it was blocked by the permission check).
- `eth_getLogs` max range **10,000,000 blocks** (testnet head ≈ 150.7M) and max 10,000 logs per query.

## Uniswap v4 addresses (same on mainnet AND testnet, verified: code present on both)
Source: https://developers.uniswap.org/docs/protocols/v4/deployments
| Contract | Address |
|---|---|
| PoolManager | 0x8366a39cc670b4001a1121b8f6a443a643e40951 |
| StateView | 0xf3334192d15450cdd385c8b70e03f9a6bd9e673b |
| Quoter (V4Quoter) | 0x8dc178efb8111bb0973dd9d722ebeff267c98f94 |
| Universal Router | 0x8876789976decbfcbbbe364623c63652db8c0904 |
| PositionManager | 0x58daec3116aae6d93017baaea7749052e8a04fa7 |
| Permit2 | 0x000000000022D473030F116dDEE9F6B43aC78BA3 |
- NOT the canonical 0x000000000004444c… PoolManager (no code on this chain).
- A second Universal Router 2.1.2 `0x204FAca1764B154221e35c0d20aBb3c525710498` exists on **mainnet only**. Use the first one.
- Initialize event topic0: `0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438`.

## Testnet pool census (≥36,629 pools, lower bound: one block range hit the 10k log cap)
- Blocks 89,069,826 → 150,746,197. 22,558 are native-ETH(address 0)/token pairs. 33,404 (~91%) have a hook.
- Fees: 0 → 18,143; 10000 → 8,352; dynamic (8388608) → 6,431; 3000 → 2,546; 500 → 460.
- Most-used token 0x8174360fbc52557c91390403b78158f85ba37255 (4,980 pools). Raw logs: `data/` not saved yet (re-query in 9.9M-block windows).

## Anon-RPC on Robinhood testnet — VERIFIED WORKING
Real Privora code, headless Chrome, Nox mixnet, reads of the testnet RPC through the worker:
`eth_chainId` → 0xb626 ✔, `eth_blockNumber` ✔, `eth_getCode(PoolManager)` ✔ (~24KB).
- Worker boot still reads the specifier via the Sepolia/mainnet public RPC (NOT anonymised; same as V2 Privora).
- Gotchas hit while testing (save yourself the time):
  - `next dev` blocks `127.0.0.1` for HMR → hydration never runs. Use **http://localhost:PORT**.
  - React StrictMode double-runs effects in dev; `startWorker()` called twice kills the first worker → "worker is not ready". Guard to run once.
  - Port 3200 is in use by another process on this machine (not ours). Use another port (we used 3217). Never `pkill next-server`; kill by PID.
  - macOS `sed -i` needs `-i ''`; use the Edit tool.
  - Do not `cat > file` without a heredoc (it blocks on stdin).
  - Headless Chrome driver: `scripts/lib/cdp.mts` (CHROME at /Applications/Google Chrome.app).

## Status checklist (update as we go)
- [x] 1 Liquidity: find funded pools (120/200 recent no-hook pools live)
- [x] 2 Real v4 reads: StateView + Quoter verified
- [~] 3 Swap from wallet (calldata simulated OK via eth_call; real wallet tx still to do) on 46630 (faucet, Universal Router + Permit2)
- [x] 4 Token: GLD/SPY via ETH swap on live pools
- [x] 5 No-hook pools exist with liquidity (GLD/SPY fee 3000 ts 60)
- [x] 6 Short hard-coded pool list: src/lib/tokenList.ts + CURATED in src/lib/uniswap/v4.ts (GLD, SPY, OPEN2)
- [~] 7 Timing: e2e run showed Nox ready ~3-4s, pools ~2s, quote ~2s (one run each; may vary, re-measure)
- [ ] 8 Hook track: custom hook (CREATE2 address flag mining) — optional
- [x] Port app (done, see 00-PLAN.md): chains.ts (+46630, v4 addrs), abis.ts, pools.ts, pricing.ts (sqrtPriceX96), SwapCard (Universal Router), native ETH currency handling

---

## Round 2 results (testnet, real calls with curl) — items 1, 2, 4, 5

**Rate limit:** testnet RPC returns `429 Too Many Requests` for a 100-call JSON-RPC batch. Use batches of ≤10 with ~1.2s pauses (worked fine). Respect it; do not rotate UAs/IPs.

**Item 1 + 5 (liquidity, no-hook):** 1,253 pools are native-ETH + no hook. Of the 200 most recent, **120 have liquidity > 0** (StateView `getLiquidity(bytes32)` selector `0xfa6793d5`; `getSlot0(bytes32)` = `0xc815641c`). Many launchpad pools show liquidity 1e26 with fee 10000 / tickSpacing 200. Stock-style pools use fee 3000 / tickSpacing 60.

**Item 2 (real v4 reads):** ✔ StateView `getSlot0` and `getLiquidity` return sane values. ✔ **Quoter `quoteExactInputSingle` works** (ABI: `quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData))` → `(uint256 amountOut, uint256 gasEstimate)`), called via eth_call. 0.001 ETH in:

| Token (testnet) | Address | Pool fee/ts | 0.001 ETH → out |
|---|---|---|---|
| GLD "Gold (Tesoro testnet)" | 0x10146876693685ea80e39b7a95628d7cdbf92b3f | 3000/60 | 0.000547 GLD |
| GLD (2nd pool) | 0x0f062258ba114d810ca8635a58a5a734a0579179 | 3000/60 | 0.000599 |
| SPY "S&P 500 ETF (Tesoro testnet)" | 0x74b9f211f1384825ee3d577005217591fc172ab4 | 3000/60 | 0.003043 |
| OPEN2 "Snipe test OPEN2" | 0x80bc2772d3b14b1e673bed96d486ab66b05e7f67 | 10000/200 | 0.000970 |
| HELD "Snipe test HELD" | 0x7b60a18e137c61b362aa75ff035150b91e9fa240 | 10000/200 | 0.000970 |
Pool IDs of the GLD/SPY pools start 0xbdde859b…, 0x56572a84…, 0xf9f551b9…; full ids in `notes/data/live-pools-sample.json`. Probe scripts: `notes/data/probe-liquidity.py`, `notes/data/probe-quoter.cjs`. (Both need the raw Initialize logs; re-pull them in ≤9.9M-block windows.)

**Item 4 (tokens):** no separate token faucet needed — the pools hold liquidity, so **faucet ETH → swap into GLD/SPY** gives the user tokens. Tokens are ERC-20, 18 decimals. PoolKey for ETH pools: currency0 = address(0) (native ETH), so the app must handle native ETH as currency0 (no WETH wrap, `value` on the Universal Router call).

**Still open:** 3 (wallet swap on 46630 + Permit2 + faucet amount), 6 (hard-code a short pool list — the above is the start), 7 (latency of Nox boot / per-read), 8 (custom hook).

---

## Round 3 — port to v4 built and verified (repo: ~/Desktop/wif-hackathon/privora-v4)

**Code changes:** `src/lib/ethereum/chains.ts` (46630/4663 + v4 addresses + `VIEM_CHAIN`), `src/lib/uniswap/{abis,v4,pricing,pools}.ts`, `src/lib/{tokenList,tokens,hooks}.ts`, `src/lib/ethereum/wallet.ts` (add-chain on 4902), `SwapCard.tsx` (Quoter + Permit2 + Universal Router), `PoolCard.tsx` + pools page (StateView), liquidity page = placeholder, UI copy changed V2→v4. `tokenList.ts` holds the static tokens so unit tests do not import the browser-only read client.

**Verified**
- `poolId(keyFor(GLD pool))` == on-chain id `0xbdde859b…` (unit test) → PoolKey encoding is right.
- `V4_SWAP` Universal Router calldata (actions 0x06,0x0c,0x0f) for 0.001 ETH → GLD / SPY / OPEN2: **`eth_call` with `from`=dummy funded via state override succeeds (no revert) on the real router**. Script: `notes/data/probe-sim-swap.mts`.
- Real-browser e2e (`scripts/e2e-v4.mts`, prod build, headless Chrome, Nox): worker ready → Pools show v4 pool state via StateView → swap quote "1 ETH ≈ 0.547182 GLD" from the v4 Quoter → Privacy Center: anonymised reads 3, **direct reads 0**.

**Not yet verified**
- A real signed swap from a wallet (needs testnet ETH from the faucet + MetaMask); token→ETH leg (ERC-20 → Permit2 → router) coded but never simulated/sent.
- Hook track (custom hook) not started.
- Quote shown comes from `useQuote`; gas estimate unused.
- e2e only covers the read path.

**Dev notes:** e2e needs `npx next build && npx next start -p 3217` then `node --no-warnings scripts/e2e-v4.mts` (use `localhost`). Kill the server by PID (`lsof -nP -iTCP:3217 -sTCP:LISTEN -t`); port 3200 belongs to something else.

## Round 4 — token → ETH leg simulated
`notes/data/probe-sim-sell.mts`: for a dummy account, set via state override the token balance (GLD/SPY slot 0, OPEN2 slot 3), ERC-20→Permit2 allowance (slot 1 / 4) and Permit2 allowance (`allowance[owner][token][spender]`, base slot 1, packed amount|expiration<<160), then `eth_call` Universal Router `execute` zeroForOne=false: **succeeds for GLD, SPY, OPEN2**. First attempt reverted with Permit2 `AllowanceExpired(0)` (0xd81b2f2e) — that was my override slot being wrong, not the contract. See `STATUS.md` for what is left.

---

## Round 5 — real $WIF (mainnet only) and plan for a test $WIF on testnet
- **$WIF = 0x5173b8eA6923c2d40267890D45C46a3480954773 on Robinhood MAINNET (4663) only.** Code present (3,248 bytes), `symbol()` = "WIF", `decimals()` = 18, total supply ≈ 999,996,817 WIF (≈1B, 18 dec), **no code on testnet (46630)**. Launched via Pons v2 (Uniswap's launchpad on Robinhood Chain → v4 hook pools). `name()` reverts (non-standard token).
- **Mainnet WIF/ETH v4 pool** (id `0x71ef4106340f0a3b9c19ec994eef4fc44a1d2513f38faac39d7636b156548c79`, init block 29,249,256): currency0 = ETH (0x0), currency1 = WIF, **fee 0, tickSpacing 200, hook 0xe5e702641ea86f4ae6cc3cdaed2b886f976be044 (Pons hook)**. slot0 tick = 143,240 (≈1.67M WIF per ETH at the time of probe), liquidity ≈ 7.5e22. It HAS a hook, so it is a hooked pool — our hook-less swap flow would not be the right path for it without understanding the Pons hook.
- **Decision (user):** deploy our own **test $WIF ("tWIF") on testnet** for the demo + a hook-less ETH/tWIF v4 pool with liquidity. Mock only — NOT the real token; label it "test $WIF" everywhere. Mainnet WIF could be shown read-only later.
- Foundry: forge at ~/.foundry/bin. Deploy flow = ERC-20 deploy → `PositionManager.multicall([initializePool, modifyLiquidities(MINT_POSITION, SETTLE_PAIR, SWEEP)])` with native ETH value.

## Round 6 — test $WIF deploy + fork swaps verified
- `forge build` of `contracts/src/TestWIF.sol` OK (solc 0.8.26 auto-downloaded). anvil fork of testnet: `anvil --fork-url https://rpc.testnet.chain.robinhood.com --chain-id 46630 --port 8545`.
- `scripts/deploy-testwif.mts deploy` on the fork: deploy tWIF → approve Permit2 → Permit2.approve(PositionManager) → `PositionManager.multicall` (initializePool + modifyLiquidities[MINT_POSITION 0x02, SETTLE_PAIR 0x0d, SWEEP 0x14], ETH sent as msg.value) → StateView: sqrtPriceX96 = 1000·2^96, **tick 138162, liquidity 2e19** (full range ±887220, 0.02 ETH + 20,000 tWIF). Price 1 ETH = 1,000,000 tWIF (≈ real WIF's mainnet ratio).
- `scripts/fork-swap-test.mts`: signed txs. 0.001 ETH → 949.659 tWIF (== Quoter), 500 tWIF → 0.000535 ETH (== Quoter). PositionManager action codes confirmed by use.
- Depth note: 0.02 ETH pool ⇒ a 0.001 ETH swap has ≈5% impact. Give the deployer more ETH (`ETH_LIQ`) for a nicer demo.
- Sources: PositionManager is `0x58da…4fa7`; uses Permit2 for the ERC-20 side (token → Permit2 → PositionManager).
