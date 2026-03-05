"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";
import type { SectionProps, ChecklistItem } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

interface IconChecklistProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  items: ChecklistItem[];
  columns?: 1 | 2;
}

export function IconChecklist({
  pill,
  title,
  subtitle,
  highlightWords,
  items,
  columns = 1,
  className,
  id,
}: IconChecklistProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: 0.1,
  });
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id={id} className={cn("py-20 px-4", className)}>
      <SectionHeader
        pill={pill}
        title={title}
        subtitle={subtitle}
        highlightWords={highlightWords}
      />

      <div
        ref={ref}
        className={cn(
          "mx-auto max-w-3xl space-y-4",
          columns === 2 && "sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0"
        )}
      >
        {items.map((item, i) => (
          <motion.div
            key={item.text}
            className="flex gap-3 rounded-xl border border-border/50 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4"
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
            animate={
              prefersReducedMotion
                ? {}
                : isInView
                  ? { opacity: 1, x: 0 }
                  : {}
            }
            transition={{
              duration: 0.3,
              delay: i * 0.05,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <motion.div
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20 text-success"
              initial={prefersReducedMotion ? {} : { scale: 0 }}
              animate={
                prefersReducedMotion
                  ? {}
                  : isInView
                    ? { scale: 1 }
                    : {}
              }
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: i * 0.05 + 0.15,
              }}
            >
              <Check className="h-3 w-3" />
            </motion.div>
            <div>
              <span className="text-sm font-medium text-foreground">{item.text}</span>
              {item.subtext && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.subtext}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
