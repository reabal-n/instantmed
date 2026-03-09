"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeader } from "./section-header";
import type { SectionProps } from "./types";
import { scrollRevealConfig } from "@/components/ui/motion";

interface AccordionEntry {
  question: string;
  answer: string;
}

interface AccordionCategory {
  category?: string;
  items: AccordionEntry[];
}

interface AccordionSectionProps extends SectionProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  groups: AccordionCategory[];
}

export function AccordionSection({
  pill,
  title,
  subtitle,
  highlightWords,
  groups,
  className,
  id,
}: AccordionSectionProps) {
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

      <div ref={ref} className="mx-auto max-w-5xl space-y-10">
        {groups.map((group, gi) => (
          <div key={group.category ?? gi}>
            {group.category && (
              <motion.h3
                className="mb-4 text-lg font-semibold text-foreground"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                animate={
                  prefersReducedMotion
                    ? {}
                    : isInView
                      ? { opacity: 1, y: 0 }
                      : undefined
                }
                transition={{ duration: 0.3, delay: gi * 0.1 }}
              >
                {group.category}
              </motion.h3>
            )}
            <Accordion type="single" collapsible className="space-y-2">
              {group.items.map((item, ii) => (
                <motion.div
                  key={item.question}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                  animate={
                    prefersReducedMotion
                      ? {}
                      : isInView
                        ? { opacity: 1, y: 0 }
                        : undefined
                  }
                  transition={{
                    duration: 0.3,
                    delay: gi * 0.1 + ii * 0.05,
                  }}
                >
                  <AccordionItem
                    value={`${gi}-${ii}`}
                    className="rounded-xl border border-border/50 bg-card/60 dark:bg-white/8 backdrop-blur-sm px-5"
                  >
                    <AccordionTrigger className="text-sm font-medium text-foreground">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </section>
  );
}
