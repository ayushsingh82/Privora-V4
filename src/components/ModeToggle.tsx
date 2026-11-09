"use client";
import { useAnon } from "@/lib/hooks";
import { setReadMode } from "@/lib/anon-rpc/manager";

export function ModeToggle() {
  const a = useAnon();
  const unavailable = a.status !== "ready";
  const anonActive = a.mode === "anon";
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-md border border-line bg-card p-0.5 text-xs font-medium">
        <button
          onClick={() => setReadMode("anon")}
          className={`rounded-md px-3 py-1.5 transition ${anonActive ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"}`}
        >
          Anon-RPC
        </button>
        <button
          onClick={() => setReadMode("direct")}
          className={`rounded-md px-3 py-1.5 transition ${!anonActive ? "bg-card2 text-fg" : "text-muted hover:text-fg"}`}
        >
          Standard
        </button>
      </div>
      <span className="hidden items-center gap-1.5 text-xs sm:flex" title="Transport used for chain reads">
        <span className={`h-2 w-2 rounded-full ${anonActive ? (unavailable ? "bg-bad" : "bg-ok") : "bg-muted"}`} />
        <span className="text-muted">
          {anonActive ? (a.status === "ready" ? "Anon-RPC active" : a.status === "starting" ? "Anon-RPC starting…" : "Anon-RPC unavailable") : "Standard RPC (direct)"}
        </span>
      </span>
    </div>
  );
}
