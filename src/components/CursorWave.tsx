"use client";
import { useEffect, useRef } from "react";

/**
 * Ambient dot grid for the landing page. Dots light up around the cursor, glow permanently in the corners and
 * carry a very slow idle wave. Plain 2D canvas, pauses when off screen, static for reduced motion.
 */
export default function CursorWave({ className = "", spacing = 30, radius = 170, corners = true }: { className?: string; spacing?: number; radius?: number; corners?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let w = 0, h = 0, raf = 0, visible = true;
    let dots: { x: number; y: number; t: number; seed: number }[] = [];

    const resize = () => {
      const r = c.getBoundingClientRect();
      w = r.width; h = r.height;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = spacing / 2; y < h; y += spacing) for (let x = spacing / 2; x < w; x += spacing) dots.push({ x, y, t: 0, seed: Math.random() });
    };
    const cornerReach = Math.min(w || 1200, 520);
    const frame = (time: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      const reach = corners ? Math.min(w, h) * 0.55 : 0;
      for (const d of dots) {
        const dm = Math.hypot(d.x - mouse.x, d.y - mouse.y);
        let target = Math.max(0, 1 - dm / radius);
        if (corners) {
          const dc = Math.min(Math.hypot(d.x, d.y), Math.hypot(w - d.x, d.y), Math.hypot(d.x, h - d.y), Math.hypot(w - d.x, h - d.y));
          target = Math.max(target, Math.max(0, 1 - dc / Math.max(reach, cornerReach * 0.4)) * 0.85);
        }
        target = Math.max(target, 0.05 + 0.05 * Math.sin(time * 0.0007 + d.x * 0.012 + d.y * 0.009));
        d.t += (target - d.t) * (reduce ? 1 : 0.1);
        const a = 0.1 + d.t * 0.85;
        const r = 1 + d.t * 2.6;
        ctx.fillStyle = d.t > 0.15 ? (d.seed > 0.55 ? `rgba(204,255,0,${a})` : `rgba(255,255,255,${a * 0.9})`) : `rgba(255,255,255,${a})`;
        if (d.seed > 0.5 && d.t > 0.15) ctx.fillRect(d.x - r, d.y - r, r * 2, r * 2);
        else { ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI * 2); ctx.fill(); }
      }
    };
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const leave = () => { mouse.x = mouse.y = -9999; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(c);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(c);
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); };
  }, [spacing, radius, corners]);
  return <canvas ref={ref} className={className} aria-hidden />;
}
