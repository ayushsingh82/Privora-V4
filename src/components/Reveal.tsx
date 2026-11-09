"use client";
import { useEffect, useRef, useState } from "react";

/** Fades and lifts content in when it scrolls into view. Content is fully visible without JS or with reduced motion. */
export default function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    setArmed(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -6% 0px" });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`${armed ? "transition duration-700 ease-out" : ""} ${armed && !shown ? "translate-y-5 opacity-0" : ""} ${className}`}>
      {children}
    </div>
  );
}
