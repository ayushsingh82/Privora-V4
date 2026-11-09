"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { decodeFunctionResult, encodeFunctionData, type Address } from "viem";
import { anonStore, type AnonState } from "./anon-rpc/manager";
import { walletStore, type WalletState } from "./ethereum/wallet";
import { readClient } from "./ethereum/read-client";
import { CHAIN } from "./ethereum/chains";
import { erc20Abi, permit2Abi, quoterAbi, stateViewAbi } from "./uniswap/abis";
import { DEFAULT_TOKENS, lookupToken, type Token } from "./tokens";
import { keyFor, poolId, routeFor } from "./uniswap/v4";

export const useAnon = (): AnonState => useSyncExternalStore(anonStore.subscribe, anonStore.getSnapshot, anonStore.getSnapshot);
export const useWallet = (): WalletState => useSyncExternalStore(walletStore.subscribe, walletStore.getSnapshot, walletStore.getSnapshot);

/** Reads only run when the active transport is usable. In Anon-RPC mode that means the worker is ready (fail closed). */
export function useReadsReady() {
  const a = useAnon();
  return { ready: a.mode === "direct" || a.status === "ready", mode: a.mode };
}

export function useTokenBalance(token: Token | null, owner: Address | null) {
  const { ready, mode } = useReadsReady();
  return useQuery({
    queryKey: ["balance", mode, CHAIN.id, token?.address, owner],
    enabled: ready && !!token && !!owner,
    queryFn: async () =>
      token!.native
        ? readClient.getBalance({ address: owner! })
        : readClient.readContract({ address: token!.address, abi: erc20Abi, functionName: "balanceOf", args: [owner!] }),
  });
}

/** ERC-20 → Permit2 allowance AND Permit2 → Universal Router allowance, in ONE multicall. */
export function usePermit2State(token: Token | null, owner: Address | null) {
  const { ready, mode } = useReadsReady();
  return useQuery({
    queryKey: ["permit2", mode, CHAIN.id, token?.address, owner],
    enabled: ready && !!token && !token.native && !!owner,
    queryFn: async () => {
      const [erc, p2] = await readClient.multicall({
        multicallAddress: CHAIN.multicall3,
        allowFailure: false,
        contracts: [
          { address: token!.address, abi: erc20Abi, functionName: "allowance", args: [owner!, CHAIN.permit2] },
          { address: CHAIN.permit2, abi: permit2Abi, functionName: "allowance", args: [owner!, token!.address, CHAIN.universalRouter] },
        ],
      });
      const [amount, expiration] = p2 as readonly [bigint, number, number];
      return { erc20ToPermit2: erc as bigint, permit2Amount: amount, permit2Expiration: expiration };
    },
  });
}

export interface Quote {
  out: bigint;
  gas: bigint;
  zeroForOne: boolean;
  fee: number;
  sqrtPriceX96: bigint;
  poolId: `0x${string}`;
}

/** On-chain V4Quoter (eth_call) + pool spot price (StateView), both in ONE multicall. Single-pool ETH ⇄ token routes. */
export function useQuote(from: Token | null, to: Token | null, amountIn: bigint) {
  const { ready, mode } = useReadsReady();
  const route = from && to ? routeFor(from, to) : null;
  return useQuery({
    queryKey: ["quote", mode, CHAIN.id, from?.address, to?.address, amountIn.toString()],
    enabled: ready && !!route && amountIn > 0n,
    retry: false,
    queryFn: async (): Promise<Quote> => {
      const { pool, zeroForOne } = route!;
      const key = keyFor(pool);
      const id = poolId(key);
      const data = encodeFunctionData({ abi: quoterAbi, functionName: "quoteExactInputSingle", args: [{ poolKey: key, zeroForOne, exactAmount: amountIn, hookData: "0x" }] });
      // The Quoter is not a view function, so it is not Multicall3-able with allowFailure=false safely; run both reads in parallel instead.
      const [q, slot0] = await Promise.all([
        readClient.call({ to: CHAIN.quoter, data }),
        readClient.readContract({ address: CHAIN.stateView, abi: stateViewAbi, functionName: "getSlot0", args: [id] }),
      ]);
      if (!q.data) throw new Error("No route: the pool returned no quote (no liquidity for this size?)");
      const [out, gas] = decodeFunctionResult({ abi: quoterAbi, functionName: "quoteExactInputSingle", data: q.data });
      if (out <= 0n) throw new Error("No route: zero output");
      return { out, gas, zeroForOne, fee: pool.fee, sqrtPriceX96: slot0[0], poolId: id };
    },
  });
}

/** Pre-select tokens from ?a=&b= (or ?from=&to=) links. Metadata is validated onchain via lookupToken. */
export function useUrlTokens(set: (slot: 0 | 1, t: Token) => void) {
  const { ready } = useReadsReady();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!ready || done || typeof window === "undefined") return;
    setDone(true);
    const p = new URLSearchParams(window.location.search);
    ([[0, p.get("a") ?? p.get("from")], [1, p.get("b") ?? p.get("to")]] as const).forEach(([slot, addr]) => {
      if (!addr) return;
      const known = DEFAULT_TOKENS.find((t) => t.address.toLowerCase() === addr.toLowerCase());
      if (known) set(slot, known);
      else lookupToken(addr).then((t) => set(slot, t)).catch(() => {});
    });
  }, [ready, done, set]);
}
