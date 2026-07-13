"use client";

import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useReducedMotion,useScrollReveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

import type { SectionProps, StatItem } from "./types";

// Worst-case width per character (tabular-nums roughly 0.6em for figure
// width; percentage + digits + prefix). 4ch covers "100%" / "$100" / "100k".
// Tier 1 review 2026-05-25 (/pricing #1) flagged the counter as wobbling
// 106 → 100 with visible layout shift. The earlier spring approach kept
// overshooting in practice; switching to a tween-only ramp removes the
// overshoot entirely, and the inline min-w lock removes any digit-count
// reflow under the surrounding flex/grid.
const VALUE_MIN_WIDTH = "4ch";

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0 });
  const prefersReducedMotion = useReducedMotion();
  // Warm-start at 30% so the counter never dead-starts from 0 on fast connections.
  const warmStart = Math.round(value * 0.3);
  const [display, setDisplay] = useState(warmStart);

  useEffect(() => {
    if (!isInView) return;
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }

    // Tween, not spring. A spring with high damping still produces a soft
    // overshoot in framer-motion 11; the review video caught the counter
    // at 106 before settling to 100. A pure ease-out tween cannot overshoot
    // by construction, so the final tick lands exactly on the target.
    const controls = animate(warmStart, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });

    return () => controls.stop();
    // warmStart is derived from value so it's intentionally not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, value, prefersReducedMotion]);

  return (
    // tabular-nums + min-width lock keeps the container the same width
    // whether the display reads "30" or "100". This kills the layout
    // shift the Tier 1 review caught on /pricing.
    <span
      ref={ref}
      className="tabular-nums inline-block text-center"
      style={{ minWidth: VALUE_MIN_WIDTH }}
    >
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}

interface StatStripProps extends SectionProps {
  stats: StatItem[];
}

export function StatStrip({ stats, className, id }: StatStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useScrollReveal(ref);
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id={id}
      ref={ref}
      className={cn(
        "py-12 px-4 border-y border-border/30 dark:border-border/50 bg-muted/20 dark:bg-muted/10",
        className
      )}
    >
      <div className="mx-auto max-w-5xl grid grid-cols-2 gap-8 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="text-center"
            initial={prefersReducedMotion ? {} : { y: 12 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, y: 0 }
                  : undefined
            }
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              delay: prefersReducedMotion ? 0 : i * 0.1,
              ease: "easeOut",
            }}
          >
            <div className="text-3xl font-semibold text-foreground sm:text-4xl">
              <AnimatedNumber
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
