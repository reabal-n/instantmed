"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollProgressProps {
  className?: string;
  /** Color of the progress bar */
  color?: "primary" | "gradient";
  /** Show only on long pages (> 150vh) */
  autoHide?: boolean;
}

/**
 * ScrollProgress - Subtle reading progress indicator
 * Fixed at top of viewport, shows scroll progress through page
 */
export function ScrollProgress({
  className,
  color = "primary",
  autoHide = true,
}: ScrollProgressProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(!autoHide);

  useEffect(() => {
    const updateProgress = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const percent = scrollHeight > 0 ? (scrolled / scrollHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, percent)));
      
      // Auto-hide on short pages
      if (autoHide) {
        setIsVisible(scrollHeight > window.innerHeight * 1.5);
      }
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    updateProgress();

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [autoHide]);

  // Respect reduced motion
  const prefersReducedMotion = 
    typeof window !== "undefined" && 
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 h-0.5 z-50 pointer-events-none",
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className={cn(
          "h-full origin-left",
          color === "gradient" 
            ? "bg-gradient-to-r from-primary via-primary/80 to-primary/60"
            : "bg-primary/70",
          !prefersReducedMotion && "transition-transform duration-150 ease-out"
        )}
        style={{ 
          transform: `scaleX(${progress / 100})`,
        }}
      />
    </div>
  );
}
