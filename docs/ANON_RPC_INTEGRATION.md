# Anon-RPC integration

Package: `@anon-rpc/browser-harness@0.4.0` (pinned exactly). API used (verified from the installed package's types
and README, not assumed): `new AnonRpcWorker({ address, config?, preExisting: { rpcProvider } })`, `worker.ready`,
`worker.fetch(url, init)`, `init.anonOptions.isolationKey`, `worker.close()`.

## Initialisation (`src/lib/anon-rpc/manager.ts` → `startWorker`)

1. The harness reads the network's **specifier contract** (address from the official `adopters.json5`) via the
   `preExisting.rpcProvider` we supply. That read is a plain `fetch` to a public RPC and is **not anonymised**; it is
   counted and shown separately as `Direct (bootstrap)` in the Privacy Center.
2. The harness verifies the worker code against the hash pinned by the specifier and loads it in a null-origin
   sandboxed iframe. `await worker.ready` resolving is our "integrity verified" signal; failure → status `failed`
   with the error shown. We don't claim any finer-grained integrity detail than the harness exposes.
3. Networks: `nox` (default), `tor-js`, `nym`. The `passthrough` reference worker is hash-pinned but does **not**
   anonymise; it is rejected in Anon-RPC mode (`PrivacyError`).

## Read path

`rpcRead(url, method, params, isolationKey)` is the only function that sends chain reads.
A viem `PublicClient` uses a `custom` transport that calls it, so every hook/service (balances, allowances, factory,
pairs, reserves, router quotes, LP balances, token metadata, receipt polling, Multicall3 batches) is covered.
There is no other RPC client in the app (no wagmi, no ethers, no subgraph, no external price API).

Supported JSON-RPC methods are whatever the destination RPC supports over HTTPS POST; the app uses `eth_call`,
`eth_getBalance`, `eth_getTransactionReceipt`, `eth_blockNumber`, `eth_getBlockByNumber`, `eth_chainId`.

## Modes

| Mode | Behaviour |
| --- | --- |
| **Anon-RPC** (default) | Needs `status === "ready"` and a real network. Otherwise throws `PrivacyError` and records a failed `anon` row. |
| **Standard** | Explicit opt-in via header toggle. Plain `fetch`, logged as `direct`. Banner states the endpoint sees your IP. |

The active mode is read **per request**, and all query keys include the mode; switching invalidates every query, so
no data or provider instance from the other transport lingers.

### Fail-closed

If the worker is `idle/starting/failed`, reads are not issued (hooks are disabled) and the banner offers **Retry** or
**Use Standard RPC** (user choice). If a call is issued anyway, `rpcRead` throws before touching the network —
unit-tested with a stubbed `fetch` asserting zero calls. A worker stopped mid-retry also throws. The Privacy Center
"Kill worker" button demonstrates this; the e2e test asserts the direct-read counter does not change.

### Resilience (still anonymous)

Mixnet exits are fragile, so anonymised reads are queued (concurrency 2), retried up to 3× on transient tunnel
errors, and the worker is restarted (30 s cooldown) after repeated `NoTunnelExitError`. Retries go back through the
worker — never direct. Reads are batched with Multicall3 to minimise round trips.

## Isolation

Each wallet session gets a fresh random `isolationKey` (`crypto.randomUUID()`), rotated on connect and on account
change, cleared on disconnect. It is **not derived from the address**. The Privacy Center shows only the *count* of
keys used. Per the harness docs, `isolationKey` "asks that calls under different keys not be linkable to one another;
support varies" by network. We make no stronger claim.

## Logging

The log stores `{id, ts, method, transport, ok, ms, error?}` only (latest 200). Request params, addresses, URLs,
keys and worker config are never logged (unit-tested to the field level).

## What each category uses

| Data | Transport |
| --- | --- |
| ETH/ERC-20 balances, allowances, factory/pair/reserves, quotes, LP, token metadata, receipts | Anon-RPC (or direct in Standard) |
| Worker specifier bootstrap | Direct (bootstrap), unavoidable |
| approve / swap / add / remove (sign + broadcast) | Wallet's own provider — **not anonymised** |
| Page, JS, fonts (system fonts only) | Direct from the host |

## What Anon-RPC does not protect

- Your address and activity onchain once you transact. Transactions are public.
- The wallet extension's own RPC traffic.
- Correlation by timing/behaviour, or compromised exits; see the Anon-RPC threat model and the chosen network's.
- The page host seeing your IP when you load the app.
