# What I need from you (in order)

Everything else is built and tested without it. Items 1–3 are the only blockers to a live testnet demo.

## 1. Testnet ETH for the deployer (blocks the test $WIF deploy) — ~2 min
```bash
cd ~/Desktop/wif-hackathon/privora-v4
node --no-warnings scripts/deploy-testwif.mts keygen   # creates a throwaway TESTNET key in .env.local (gitignored) and prints its address
```
- Open https://faucet.testnet.chain.robinhood.com and request ETH to **that printed address**. Need ≈ **0.025 ETH** (0.02 liquidity + gas). If the faucet gives less, use `ETH_LIQ=0.005` (smaller pool, bigger price impact).
- Then tell me "funded". I run `deploy` and the app picks up `tWIF` automatically (`src/lib/deployed.ts`).
- This key is **testnet only**. Never put real funds in it. (Or paste your own testnet key into `.env.local` as `DEPLOYER_PRIVATE_KEY=0x…` — only if you accept that I read that file.)

## 2. A wallet with testnet ETH for the swap demo
- A browser wallet (MetaMask/Rabby) with a **different** account than the deployer is best (the demo should look like a normal user).
- Request faucet ETH to that wallet too (≥ 0.005 ETH). The app's "Before you swap" box walks through connect → add network → faucet → ready, and disappears when everything is green.
- I can't operate your wallet. You click Connect/Swap/confirm; I'll read the result.

## 3. Hackathon submission info (ask the organizers — Discord discord.com/invite/PjXcRJ2uYY, X @WIFonRH)
- How to submit (form? link? repo?), judging criteria, track choice (hooks-and-defi vs tools-and-infra), whether a deployed URL and demo video are required, the real prize split.
- Whether a **test** $WIF on testnet is acceptable for the demo (real $WIF is mainnet-only).

## 4. To publish (your accounts — I won't create these without you)
- GitHub: create an empty repo and give me the URL (or run `gh auth login`), so I can commit + push. **Nothing is committed yet.**
- Hosting: a Vercel (or similar) account for a public URL.
- Demo video: you record following `docs/DEMO_SCRIPT.md` (≈ 2–3 min).

## 5. Decisions only you can make
- **Custom hook for the hooks track?** (Foundry is installed, but a hook = Solidity + CREATE2 address mining + more testing; I'd only start after the wallet demo works.) Y/N.
- **Mainnet at all?** Current plan is testnet only. Real $WIF + the Pons hook pool on mainnet is a different (hooked) pool, so I'd show it read-only at most. Y/N.
- Keep the name/branding "Privora" and the test token name "Test $WIF (tWIF)"? Y/N.

## Deadline
Submissions close **12 Nov 2026, 17:30 UTC**.
