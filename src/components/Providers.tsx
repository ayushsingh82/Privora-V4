"use client";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_NETWORK } from "@/lib/anon-rpc/networks";
import { startWorker, stopWorker } from "@/lib/anon-rpc/manager";
import { reattach } from "@/lib/ethereum/wallet";
import { useAnon } from "@/lib/hooks";
import { isPrivacyBlock } from "@/lib/errors";

/** Refetch every chain read when the transport changes, so no stale data from the other transport is shown. */
function ModeRefresher() {
  const qc = useQueryClient();
  const { mode, status } = useAnon();
  useEffect(() => { qc.invalidateQueries(); }, [mode, status, qc]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: (n, err) => !isPrivacyBlock(err) && n < 2 } } }));
  useEffect(() => {
    startWorker(DEFAULT_NETWORK).catch(() => { /* surfaced in the UI via anon state */ });
    reattach();
    return () => stopWorker();
  }, []);
  return (
    <QueryClientProvider client={qc}>
      <ModeRefresher />
      {children}
    </QueryClientProvider>
  );
}
