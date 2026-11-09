# 2–3 minute judge demo

Prereqs: `npm run dev` (or build+start), Chrome with a wallet on Sepolia (some Sepolia ETH). Reads work without one.

1. **Open the app (0:00)** — On the landing page click *Launch App*, then *Connect wallet*. The sidebar shows `Anon-RPC active` (green) once the worker is ready
   (few seconds). Point at the sentence under the swap button: reads via Anon-RPC, writes not anonymised.
2. **Standard mode (0:20)** — Toggle *Standard*. The warning banner says reads are direct and the RPC sees your IP.
   Open a pair via the token selector (paste token `0x174F4259E885EBaFcDc6c09f38a493c4CA90b85e`, then
   `0x832262D88e6C02A31C7C267B6536cFafe7Fdf3E8` — a live Sepolia V2 pair). Balance, reserves-based quote appear.
3. **Privacy Center (0:50)** — Open *Privacy* in the sidebar: rows are labelled **Direct RPC**, anonymised counter is 0.
4. **Anon-RPC (1:10)** — Toggle *Anon-RPC*. Queries refetch. Privacy Center: rows now **Anon-RPC / eth_call /
   Success** with seconds-scale latency; "Anonymised reads ✓" climbs; Direct stays flat.
5. **Swap (1:40)** — Enter an amount: quote, price impact, min received appear (Anon-RPC reads). Click *Approve*
   (exact amount), then *Swap*; confirm in the wallet. Status shows the tx link; the receipt is polled over the
   read transport. The submission itself is the wallet's — say so.
6. **Fail-closed (2:20)** — In the Privacy page click *Kill worker*. Red banner: *Anon-RPC unavailable — reads are
   blocked*; the "Direct reads" counter does not move. Offer *Retry* (recovers) or *Use Standard RPC* (explicit).

Automated version of steps 2–4 and 6: `npm run e2e`.
