"use client";

import { motion, useInView, useReducedMotion, useSpring, useMotionValue } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { scrollRevealConfig } from "@/components/ui/motion";
import type { SectionProps, StatItem } from "./types";

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  // Inline spring config to avoid Transition vs SpringOptions type mismatch
  const spring = useSpring(motionValue, { stiffness: 300, damping: 20, mass: 1 });
  const [display, setDisplay] = useState(0);

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
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id={id}
      ref={ref}
      className={cn(
        "py-12 px-4 border-y border-border/50 bg-muted/30",
        className
      )}
    >
      <div className="mx-auto max-w-5xl grid grid-cols-2 gap-8 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="text-center"
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, y: 0 }
                  : {}
            }
            transition={{
              duration: 0.3,
              delay: i * 0.1,
              ease: "easeOut",
            }}
          >
            <div className="text-3xl font-bold text-foreground sm:text-4xl">
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
