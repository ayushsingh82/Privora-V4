"use client";
import Brackets from "@/components/Brackets";
import { useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CHAIN } from "@/lib/ethereum/chains";
import { erc20Abi, permit2Abi } from "@/lib/uniswap/abis";
import { fetchCuratedPools } from "@/lib/uniswap/pools";
import { encodeDecrease, encodeMintFullRange, liquidityForEth, liquidityShare, positionManagerAbi, transferEvent } from "@/lib/uniswap/liquidity";
import { getAddress } from "viem";
import { useReadsReady, useTokenBalance, useWallet } from "@/lib/hooks";
import { connect, getWalletClient, switchToAppChain } from "@/lib/ethereum/wallet";
import { bufferedGas, runTx, type TxState } from "@/lib/ethereum/tx";
import { readClient } from "@/lib/ethereum/read-client";
import { ETH } from "@/lib/tokens";
import TxStatus from "./TxStatus";

const fmt = (v: bigint | undefined, d = 18, max = 6) => (v === undefined ? "–" : Number(formatUnits(v, d)).toLocaleString(undefined, { maximumFractionDigits: max }));

export default function LiquidityCard() {
  const w = useWallet();
  const qc = useQueryClient();
  const { ready } = useReadsReady();
  const [idx, setIdx] = useState(0);
  const [amount, setAmount] = useState("");
  const [tx, setTx] = useState<TxState>({ phase: "idle" });

  const pools = useQuery({ queryKey: ["lp-pools"], enabled: ready, queryFn: fetchCuratedPools });
  const pool = pools.data?.[idx];
  const token = pool?.token1;
  const balEth = useTokenBalance(ETH, w.address);
  const balTok = useTokenBalance(token ?? null, w.address);
  // Positions are NFTs and the PositionManager is not enumerable: find them from Transfer logs (read via the private transport), then verify ownership.
  const positions = useQuery({
    queryKey: ["lp-positions", w.address], enabled: ready && !!w.address,
    queryFn: async () => {
      const head = await readClient.getBlockNumber();
      const logs = await readClient.getLogs({ address: CHAIN.positionManager, event: transferEvent, args: { to: w.address! }, fromBlock: head > 9_000_000n ? head - 9_000_000n : 0n, toBlock: head });
      const ids = [...new Set(logs.map((l) => l.args.id!))].sort((a, b) => (a < b ? 1 : -1)).slice(0, 12);
      const rows = await Promise.all(ids.map(async (id) => {
        const [owner, liquidity, info] = await Promise.all([
          readClient.readContract({ address: CHAIN.positionManager, abi: positionManagerAbi, functionName: "ownerOf", args: [id] }).catch(() => null),
          readClient.readContract({ address: CHAIN.positionManager, abi: positionManagerAbi, functionName: "getPositionLiquidity", args: [id] }).catch(() => 0n),
          readClient.readContract({ address: CHAIN.positionManager, abi: positionManagerAbi, functionName: "getPoolAndPositionInfo", args: [id] }).catch(() => null),
        ]);
        return owner && info && getAddress(owner) === getAddress(w.address!) && liquidity > 0n ? { id, liquidity, key: info[0] } : null;
      }));
      return rows.filter((r): r is NonNullable<typeof r> => !!r);
    },
  });
  const allow = useQuery({
    queryKey: ["lp-allow", token?.address, w.address], enabled: ready && !!token && !!w.address,
    queryFn: async () => {
      const [erc, p2] = await readClient.multicall({ multicallAddress: CHAIN.multicall3, allowFailure: false, contracts: [
        { address: token!.address, abi: erc20Abi, functionName: "allowance", args: [w.address!, CHAIN.permit2] },
        { address: CHAIN.permit2, abi: permit2Abi, functionName: "allowance", args: [w.address!, token!.address, CHAIN.positionManager] },
      ] });
      const [amt, exp] = p2 as readonly [bigint, number, number];
      return { erc: erc as bigint, p2: amt, exp };
    },
  });

  let ethIn = 0n;
  try { ethIn = amount && Number(amount) > 0 ? parseUnits(amount, 18) : 0n; } catch { /* invalid */ }
  const calc = pool && ethIn > 0n ? liquidityForEth(ethIn, pool.sqrtPriceX96) : null;
  const need = calc?.amount1Max ?? 0n;
  const needErc = !!calc && (allow.data?.erc ?? 0n) < need;
  const needP2 = !!calc && !needErc && !!allow.data && (allow.data.p2 < need || allow.data.exp <= Math.floor(Date.now() / 1000));
  const insufficientEth = balEth.data !== undefined && !!calc && calc.amount0Max > balEth.data;
  const insufficientTok = balTok.data !== undefined && !!calc && need > balTok.data;
  const wrongChain = w.chainId !== null && w.chainId !== CHAIN.id;
  const busy = tx.phase === "wallet" || tx.phase === "pending";
  const refetch = () => { qc.invalidateQueries(); };

  async function approveErc() {
    if (await runTx(`Approve ${token!.symbol} for Permit2`, () => getWalletClient().writeContract({ address: token!.address, abi: erc20Abi, functionName: "approve", args: [CHAIN.permit2, need] }), setTx)) refetch();
  }
  async function approveP2() {
    const exp = Math.floor(Date.now() / 1000) + 30 * 60;
    if (await runTx(`Allow PositionManager to spend ${token!.symbol}`, () => getWalletClient().writeContract({ address: CHAIN.permit2, abi: permit2Abi, functionName: "approve", args: [token!.address, CHAIN.positionManager, need, exp] }), setTx)) refetch();
  }
  async function remove(pos: { id: bigint; liquidity: bigint; key: Parameters<typeof encodeDecrease>[0]["key"] }, pct: number) {
    if (!w.address) return;
    const me = w.address;
    const amt = liquidityShare(pos.liquidity, pct);
    const unlock = encodeDecrease({ key: pos.key, tokenId: pos.id, liquidity: amt, burn: pct >= 100, recipient: me });
    const req = { address: CHAIN.positionManager, abi: positionManagerAbi, functionName: "modifyLiquidities", args: [unlock, BigInt(Math.floor(Date.now() / 1000) + 1800)] } as const;
    const send = async () => {
      await readClient.simulateContract({ ...req, account: me }).catch((e) => { throw new Error(`Remove liquidity would fail: ${(e as { shortMessage?: string }).shortMessage ?? (e as Error).message}`); });
      const gas = await bufferedGas(() => readClient.estimateContractGas({ ...req, account: me }));
      return getWalletClient().writeContract({ ...req, ...(gas ? { gas } : {}) });
    };
    if (await runTx(`Remove ${pct}% of position #${pos.id}`, send, setTx)) refetch();
  }

  async function add() {
    if (!pool || !calc || !w.address) return;
    const me = w.address;
    const unlock = encodeMintFullRange({ key: pool.key, liquidity: calc.liquidity, amount0Max: calc.amount0Max, amount1Max: calc.amount1Max, recipient: me });
    const req = { address: CHAIN.positionManager, abi: positionManagerAbi, functionName: "modifyLiquidities", args: [unlock, BigInt(Math.floor(Date.now() / 1000) + 1800)], value: calc.amount0Max } as const;
    const send = async () => {
      // Simulate through the READ transport first, so a doomed transaction never reaches the wallet.
      await readClient.simulateContract({ ...req, account: me }).catch((e) => { throw new Error(`Add liquidity would fail: ${(e as { shortMessage?: string }).shortMessage ?? (e as Error).message}`); });
      const gas = await bufferedGas(() => readClient.estimateContractGas({ ...req, account: me }));
      return getWalletClient().writeContract({ ...req, ...(gas ? { gas } : {}) });
    };
    if (await runTx(`Add liquidity to ETH/${token!.symbol}`, send, setTx)) { setAmount(""); refetch(); }
  }

  const btn = (() => {
    if (!w.address) return { text: "Connect wallet", fn: connect, on: true };
    if (wrongChain) return { text: `Switch to ${CHAIN.name}`, fn: switchToAppChain, on: true };
    if (!ready) return { text: "Anon-RPC not ready" };
    if (!pool) return { text: "Loading pools…" };
    if (!calc) return { text: "Enter an ETH amount" };
    if (insufficientEth) return { text: "Insufficient ETH balance" };
    if (insufficientTok) return { text: `Insufficient ${token!.symbol} balance` };
    if (needErc) return { text: busy ? "Approving…" : `Approve ${token!.symbol} (step 1/2)`, fn: approveErc, on: !busy };
    if (needP2) return { text: busy ? "Approving…" : "Allow PositionManager (step 2/2)", fn: approveP2, on: !busy };
    return { text: busy ? "Adding…" : "Add liquidity", fn: add, on: !busy };
  })();

  return (
    <div className="relative w-full max-w-md bg-card p-4">
      <Brackets corners={["tl", "br"]} size={26} />
      <h2 className="px-2 pb-2 pt-1 text-lg font-semibold">Add liquidity</h2>
      <div className="rounded-none border border-line bg-card2 p-4">
        <div className="mb-2 text-sm text-muted">Pool</div>
        <select value={idx} onChange={(e) => { setIdx(Number(e.target.value)); setTx({ phase: "idle" }); }} className="mono w-full border border-line bg-card px-3 py-2 text-sm">
          {(pools.data ?? []).map((p, i) => <option key={p.id} value={i}>ETH / {p.token1.symbol} · {p.fee / 10000}%{p.key.hooks !== "0x0000000000000000000000000000000000000000" ? " · Guard hook" : ""}</option>)}
        </select>
      </div>
      <div className="mt-2 rounded-none border border-line bg-card2 p-4">
        <div className="mb-2 text-sm text-muted">ETH to deposit</div>
        <input value={amount} onChange={(e) => { setTx({ phase: "idle" }); setAmount(e.target.value.replace(/[^0-9.]/g, "")); }} inputMode="decimal" placeholder="0.0" className="mono w-full bg-transparent text-3xl font-medium outline-none placeholder:text-muted/40" />
        <div className="mt-2 text-xs text-muted">Balance: {fmt(balEth.data)} ETH</div>
      </div>
      <div className="mt-2 rounded-none border border-line bg-card2 p-4 text-sm">
        <div className="mb-1 text-muted">{token?.symbol ?? "Token"} paired (set by the pool price)</div>
        <div className="mono text-2xl">{calc ? fmt(calc.token, 18, 4) : "0.0"}</div>
        <div className="mt-2 text-xs text-muted">Balance: {fmt(balTok.data)} {token?.symbol}</div>
      </div>
      <p className="mt-3 px-2 text-xs text-muted">Full-range position on a Uniswap v4 pool. Up to 5% price movement is tolerated; unused amounts are returned. Pool and balance reads go through Anon-RPC. The position NFT is minted to your wallet, and the transaction itself is public.</p>
      <button disabled={!("fn" in btn) || !btn.on} onClick={() => "fn" in btn && btn.fn?.()} className="mt-3 w-full rounded-none bg-accent py-4 text-base font-semibold text-accent-fg transition hover:brightness-110 disabled:bg-card2 disabled:text-muted">{btn.text}</button>
      <TxStatus tx={tx} />
      <div className="mt-4 border-t border-line pt-3">
        <div className="mb-2 text-sm font-semibold">Your positions</div>
        {!w.address && <p className="text-xs text-muted">Connect a wallet to see your positions.</p>}
        {w.address && positions.isFetching && !positions.data && <p className="text-xs text-muted">Looking up positions…</p>}
        {positions.data?.length === 0 && <p className="text-xs text-muted">No open positions.</p>}
        {positions.data?.map((pos) => {
          const sym = pools.data?.find((p) => p.key.currency1.toLowerCase() === pos.key.currency1.toLowerCase() && p.key.hooks.toLowerCase() === pos.key.hooks.toLowerCase())?.token1.symbol ?? "token";
          return (
            <div key={pos.id.toString()} className="mb-2 border border-line bg-card2 p-3 text-xs">
              <div className="flex justify-between"><span className="mono">#{pos.id.toString()} · ETH / {sym}{pos.key.hooks !== "0x0000000000000000000000000000000000000000" ? " · Guard" : ""}</span><span className="mono text-muted">L {pos.liquidity.toString()}</span></div>
              <div className="mt-2 flex gap-1.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button key={pct} disabled={busy || wrongChain} onClick={() => remove(pos, pct)} className="flex-1 rounded-md bg-accent/15 px-2 py-1 font-semibold text-accent hover:bg-accent/25 disabled:opacity-40">{pct === 100 ? "Remove all" : `${pct}%`}</button>
                ))}
              </div>
            </div>
          );
        })}
        <p className="mt-1 text-xs text-muted">Removing returns both assets to your wallet (100% also burns the position NFT). The transaction is simulated first.</p>
      </div>
    </div>
  );
}
