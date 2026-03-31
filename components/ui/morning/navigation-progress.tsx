"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion";

export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Track whether the user has navigated at least once
  const initialPathRef = useRef(pathname);
  useEffect(() => {
    if (pathname !== initialPathRef.current) {
      setHasNavigated(true);
    }
    setIsNavigating(false);
  }, [pathname]);

  // Only attach the click listener after the first navigation has occurred,
  // or lazily on first click — attach always but keep the handler cheap
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
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (prefersReducedMotion) return null;
  if (!hasNavigated) return null;

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[100] h-0.5 bg-accent-teal"
          initial={{ scaleX: 0, transformOrigin: "left" }}
          animate={{ scaleX: 0.7 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: 2, ease: "easeOut" },
            opacity: { duration: 0.15, delay: 0 },
          }}
        />
      )}
    </AnimatePresence>
  );
}
