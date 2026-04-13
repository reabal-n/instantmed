"use client";

import { motion, useInView, useMotionValue,useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useReducedMotion,useScrollReveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

import type { SectionProps, StatItem } from "./types";

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0 });
  const prefersReducedMotion = useReducedMotion();
  // Warm-start at 30% so the counter never dead-starts from 0 on fast connections.
  const warmStart = Math.round(value * 0.3);
  const motionValue = useMotionValue(warmStart);
  // Inline spring config to avoid Transition vs SpringOptions type mismatch
  const spring = useSpring(motionValue, { stiffness: 300, damping: 20, mass: 1 });
  const [display, setDisplay] = useState(warmStart);

  useEffect(() => {
    if (isInView && !prefersReducedMotion) {
      motionValue.set(value);
    } else if (isInView) {
      setDisplay(value);
    }
  }, [isInView, value, motionValue, prefersReducedMotion]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => {
      setDisplay(Math.round(v));
    });
    return unsubscribe;
  }, [spring]);

  return (
    <span ref={ref}>
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
              duration: 0.3,
              delay: i * 0.1,
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
