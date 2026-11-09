// User settings shared by Swap and Liquidity. Per-browser convenience only (localStorage, always try/catch).
import { useSyncExternalStore } from "react";

export interface Settings { slippageBps: number; deadlineMin: number }
const KEY = "privora.settings.v1";
const DEFAULTS: Settings = { slippageBps: 50, deadlineMin: 20 };

function load(): Settings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!raw) return DEFAULTS;
    const j = JSON.parse(raw);
    return {
      slippageBps: Number.isInteger(j.slippageBps) && j.slippageBps >= 1 && j.slippageBps <= 5000 ? j.slippageBps : DEFAULTS.slippageBps,
      deadlineMin: Number.isInteger(j.deadlineMin) && j.deadlineMin >= 1 && j.deadlineMin <= 180 ? j.deadlineMin : DEFAULTS.deadlineMin,
    };
  } catch { return DEFAULTS; }
}

let state: Settings = DEFAULTS;
let hydrated = false;
const listeners = new Set<() => void>();

export function setSettings(patch: Partial<Settings>) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
export const getSettings = () => state;

const subscribe = (l: () => void) => {
  if (!hydrated) { hydrated = true; state = load(); }
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useSettings = (): Settings => useSyncExternalStore(subscribe, () => state, () => DEFAULTS);
