"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
// framer-motion removed - module factory race condition in root layout chunk.
// Progress bar uses CSS transition triggered via requestAnimationFrame.
// useReducedMotion inlined here (not imported from motion.tsx) to avoid
// co-bundling with the framer-motion chunk, which causes factory unavailability
// during Turbopack's first cold load (Next.js #70703).

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [scaleX, setScaleX] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const initialPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname !== initialPathRef.current) {
      setHasNavigated(true);
    }
    setIsNavigating(false);
    setScaleX(0);
  }, [pathname]);

  // Trigger CSS transition one frame after mount to animate from 0 → 0.85
  useEffect(() => {
    if (!isNavigating) return;
    const raf = requestAnimationFrame(() => setScaleX(0.85));
    return () => cancelAnimationFrame(raf);
  }, [isNavigating]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (
        target?.href &&
        target.origin === window.location.origin &&
        target.pathname !== pathname
      ) {
        setHasNavigated(true);
        setIsNavigating(true);
        setScaleX(0);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (prefersReducedMotion || !hasNavigated || !isNavigating) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-accent-teal"
      style={{
        transformOrigin: "left",
        transform: `scaleX(${scaleX})`,
        transition: "transform 0.4s ease-out",
      }}
    />
  );
}
