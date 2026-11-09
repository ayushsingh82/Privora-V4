import { test } from "node:test";
import assert from "node:assert/strict";
import { getSettings, setSettings } from "./settings.ts";

test("settings update and are readable (no localStorage in node: must not throw)", () => {
  assert.equal(getSettings().slippageBps, 50);
  setSettings({ slippageBps: 100, deadlineMin: 30 });
  assert.deepEqual(getSettings(), { slippageBps: 100, deadlineMin: 30 });
});
