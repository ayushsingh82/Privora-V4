"use client";
import { useAnon } from "@/lib/hooks";

/** Live, honest status chips under the swap card. Every number is counted from real requests this session. */
export default function PrivacyStrip() {
  const a = useAnon();
  const state = a.mode === "direct" ? "Standard RPC" : a.status === "ready" ? "Anon-RPC active" : a.status === "failed" ? "Anon-RPC unavailable" : "Anon-RPC starting…";
  const tone = a.mode === "direct" ? "bg-muted" : a.status === "ready" ? "bg-ok" : a.status === "failed" ? "bg-bad" : "bg-accent";
  const Stat = ({ k, v, big }: { k: string; v: React.ReactNode; big?: boolean }) => (
    <div className="bg-card px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{k}</div>
      <div className={`mt-1 ${big ? "mono text-2xl font-semibold" : "text-sm font-medium"}`}>{v}</div>
    </div>
  );
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-px sm:grid-cols-3 overflow-hidden rounded-none border border-line bg-line md:grid-cols-3">
      <Stat k="Read transport" v={<span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${tone}`} />{state}</span>} />
      <Stat k="Anonymised reads" v={a.anonOk} big />
      <Stat k="Direct reads" v={a.directOk + a.directFailed} big />
    </div>
  );
}
