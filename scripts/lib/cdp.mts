// Minimal Chrome DevTools Protocol driver (no dependencies; uses Node's global WebSocket).
// Launches headless Chrome with a throwaway profile, so tests never touch the user's browser data.

import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export interface Page {
  goto(url: string): Promise<void>;
  eval<T = unknown>(expr: string): Promise<T>;
  waitFor(expr: string, timeoutMs?: number, label?: string): Promise<void>;
  click(selectorOrText: string): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  /** Raw CDP access, used by the pitch-video recorder (screencast frames). */
  send(method: string, params?: object): Promise<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  on(method: string, handler: (params: Record<string, any>) => void): void; // eslint-disable-line @typescript-eslint/no-explicit-any
  screenshot(path: string, clip?: { x: number; y: number; width: number; height: number }): Promise<void>;
  logs: string[];
  errors: string[];
  close(): Promise<void>;
}

export async function launch(opts: { width?: number; height?: number; scale?: number } = {}): Promise<Page> {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = mkdtempSync(join(tmpdir(), "sr-chrome-"));
  const proc: ChildProcess = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      `--window-size=${opts.width ?? 1280},${opts.height ?? 1000}`,
      ...(opts.scale ? [`--force-device-scale-factor=${opts.scale}`] : []),
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let wsUrl = "";
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
      wsUrl = list.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? "";
    } catch {
      /* not up yet */
    }
    if (!wsUrl) await new Promise((r) => setTimeout(r, 250));
  }
  if (!wsUrl) {
    proc.kill();
    throw new Error("Chrome DevTools endpoint did not come up");
  }

  const ws = new WebSocket(wsUrl);
  await new Promise<void>((res, rej) => {
    ws.onopen = () => res();
    ws.onerror = () => rej(new Error("ws error"));
  });

  let id = 0;
  type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const pending = new Map<number, { res: (v: Json) => void; rej: (e: Error) => void }>();
  const logs: string[] = [];
  const errors: string[] = [];
  const handlers = new Map<string, Array<(p: Json) => void>>();
  ws.onmessage = (ev) => {
    const m = JSON.parse(String(ev.data));
    if (m.method && handlers.has(m.method)) for (const h of handlers.get(m.method)!) h(m.params);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id)!;
      pending.delete(m.id);
      if (m.error) p.rej(new Error(m.error.message));
      else p.res(m.result);
    } else if (m.method === "Runtime.consoleAPICalled") {
      const text = (m.params.args ?? []).map((a: { value?: unknown; description?: string }) => String(a.value ?? a.description ?? "")).join(" ");
      (m.params.type === "error" ? errors : logs).push(text);
    } else if (m.method === "Runtime.exceptionThrown") {
      errors.push(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text ?? "exception");
    }
  };
  const send = (method: string, params: object = {}) =>
    new Promise<Json>((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  // A background/hidden page throttles rendering and React's scheduler never hydrates it.
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Page.bringToFront");

  const evalExpr = async <T,>(expr: string): Promise<T> => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value as T;
  };

  const page: Page = {
    logs,
    errors,
    send: (method, params) => send(method, params ?? {}),
    on(method, handler) { handlers.set(method, [...(handlers.get(method) ?? []), handler]); },
    async goto(url) {
      await send("Page.navigate", { url });
      await new Promise((r) => setTimeout(r, 500));
    },
    eval: evalExpr,
    async waitFor(expr, timeoutMs = 15000, label = expr) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        try {
          if (await evalExpr<boolean>(`!!(${expr})`)) return;
        } catch {
          /* page navigating */
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error(`Timed out waiting for: ${label}`);
    },
    async click(sel) {
      const ok = await evalExpr<boolean>(`(() => {
        const q = ${JSON.stringify(sel)};
        const visible = (e) => e.getClientRects().length > 0;
        let el = null;
        try { el = [...document.querySelectorAll(q)].find(visible) || null; } catch {}
        if (!el) el = [...document.querySelectorAll('button,a,[role=tab]')].filter(visible).find(e => e.textContent && e.textContent.trim().includes(q));
        if (!el) return false;
        el.click(); return true; })()`);
      if (!ok) throw new Error(`click: nothing matches ${sel}`);
    },
    async type(sel, text) {
      const ok = await evalExpr<boolean>(`(() => {
        const el = document.querySelector(${JSON.stringify(sel)});
        if (!el) return false;
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(text)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true; })()`);
      if (!ok) throw new Error(`type: no element ${sel}`);
    },
    async screenshot(path, clip) {
      const r = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
      const { writeFileSync } = await import("node:fs");
      writeFileSync(path, Buffer.from(r.data, "base64"));
    },
    async close() {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      proc.kill();
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    },
  };
  return page;
}
