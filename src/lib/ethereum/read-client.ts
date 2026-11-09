// Read client: a viem PublicClient whose transport is the Anon-RPC choke point. The active mode is resolved per
// request, so switching modes can never leave a stale provider in use. Writes never touch this file.
import { createPublicClient, custom } from "viem";
import { CHAIN } from "./chains";
import { rpcRead } from "../anon-rpc/manager";

let isolationKey: string | undefined;
/** A fresh random key per wallet session — deliberately NOT derived from the address. */
export function rotateIsolationKey() {
  isolationKey = crypto.randomUUID();
}
export function clearIsolationKey() {
  isolationKey = undefined;
}

export const readClient = createPublicClient({
  transport: custom({
    request: ({ method, params }) => rpcRead(CHAIN.rpc, method, (params as unknown[]) ?? [], isolationKey) as Promise<never>,
  }),
});
