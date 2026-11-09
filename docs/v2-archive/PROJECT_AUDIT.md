# Project audit

## Starting point

The repository this folder lives in (ROUTIQ) contains **no Uniswap V2 frontend**; there was nothing to fork. The
Uniswap-compatible interface was therefore written from scratch in the project folder against the unmodified, published
Uniswap V2 contract interfaces (Factory, Pair, Router02, ERC-20). No Uniswap interface source (GPL-3.0) is copied, so
there is no licence obligation beyond our own MIT licence; "Uniswap" is only used descriptively.

From the parent repo we reused (and re-verified) only the **Anon-RPC network list and worker-lifecycle pattern**
(`adopters.json5` addresses, bootstrap-read pattern, fail-closed approach) and a dependency-free Chrome DevTools driver
for e2e tests. the project folder has no imports from the parent and is its own git repo.

## Architecture

Next.js 16.4.5 (App Router) · React 19 · TypeScript · Tailwind v4 · viem · TanStack Query ·
`@anon-rpc/browser-harness@0.4.0`. No wagmi/ethers/subgraph/GraphQL/external price APIs.

## Read paths (all through `rpcRead`)

| Read | Where | Method |
| --- | --- | --- |
| ETH / ERC-20 balance | `useTokenBalance` | `eth_getBalance`, `eth_call` |
| Allowance (token, LP) | `useAllowance` | `eth_call` |
| Pair + reserves + supply | `usePair` | `getPair`, `token0`, `getReserves`, `totalSupply` |
| Quote | `useQuote` | router `getAmountsOut` via Multicall3 |
| LP balance / position | `useLpBalance` | `eth_call` |
| Pool discovery/search | `lib/uniswap/pools.ts` | factory `allPairs*`, Multicall3 |
| Token metadata | `lib/tokens.ts` | `symbol/name/decimals` via Multicall3 |
| Tx receipt | `lib/ethereum/tx.ts` | `eth_getTransactionReceipt` polling |

## Write paths (not anonymised)

`getWalletClient()` → `window.ethereum`: `approve` (exact amount), router `swap*`, `addLiquidity*`,
`removeLiquidity*`. Separate module, separate transport.

## Contracts & network

Centralised in `src/lib/ethereum/chains.ts`. Router→`factory()`/`WETH()` were checked with live `eth_call`s on both
chains (this caught a wrong Sepolia WETH guess; the router reports `0xfFf9…6B14`). Multicall3 presence verified.

| | Sepolia (default, 11155111) | Mainnet (1) |
| --- | --- | --- |
| Factory | `0xF62c03E08ada871A0bEb309762E260a7a6a880E6` | `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f` |
| Router02 | `0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3` | `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` |
| WETH | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |

Anon-RPC exits fetch the chain RPC over HTTPS, so any HTTPS JSON-RPC works; the Nox specifier lives on Sepolia, tor-js
and Nym on mainnet (bootstrap only).

## Compatibility issues found

- Public mixnets are slow/flaky (see TEST_REPORT): addressed with batching, queue, retry, self-heal, honest errors.
- Nox "No exit offers TLS tunnels" intermittently; not fixable client-side beyond restart/retry.
- tor-js demo gateway did not boot in our test window; Nym booted (~36 s) but reads timed out at ~24 s. Nox is default.
- Next.js 16 differs from older versions (read `node_modules/next/dist/docs`); only basic App Router features used.

## Not built (yet)

Dedicated Settings page (slippage is per-card), multi-hop beyond via-WETH, EIP-6963 wallet discovery, lint config.
