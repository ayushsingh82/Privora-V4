// Turns raw viem / transport errors into one short, readable line. Raw RPC dumps (call arguments, docs links) never reach the UI.
export const isPrivacyBlock = (e: unknown) => /Anon-RPC worker is not ready|refusing to fall back/i.test(String((e as Error)?.message ?? e));

export function friendly(e: unknown): string {
  if (isPrivacyBlock(e)) return "The privacy layer is not ready. Reads are paused (never sent directly) and resume on their own.";
  const msg = String((e as { shortMessage?: string })?.shortMessage ?? (e as Error)?.message ?? e);
  return msg.split("\n")[0].replace(/\s*(Docs|Version|Details):.*$/i, "").slice(0, 200);
}
