"use client";

import { motion, useInView } from "framer-motion";
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
import { scrollRevealConfig, useReducedMotion } from "@/components/ui/motion";

const MotionAccordionItem = motion.create(AccordionItem);

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
  title?: string;
  subtitle?: string;
  highlightWords?: string[];
  groups: readonly AccordionCategory[] | AccordionCategory[];
  hideHeader?: boolean;
}

export function AccordionSection({
  pill,
  title,
  subtitle,
  highlightWords,
  groups,
  hideHeader,
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
    <section id={id} className={cn("py-16 lg:py-24 px-4", className)}>
      {!hideHeader && title && (
        <SectionHeader
          pill={pill}
          title={title}
          subtitle={subtitle}
          highlightWords={highlightWords}
        />
      )}

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
            <Accordion type="single" collapsible className="space-y-3">
              {group.items.map((item, ii) => (
                <MotionAccordionItem
                  key={item.question}
                  value={`${gi}-${ii}`}
                  className="rounded-xl border border-border/30 dark:border-border/50 bg-white dark:bg-card px-5 transition-all hover:shadow-sm hover:shadow-primary/[0.04]"
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
                  <AccordionTrigger className="text-sm font-semibold text-foreground">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </MotionAccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </section>
  );
}
