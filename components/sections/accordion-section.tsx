"use client";

import { motion } from "framer-motion";
import { useRef } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useReducedMotion,useScrollReveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

import { SectionHeader } from "./section-header";
import type { SectionProps } from "./types";

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
  const isInView = useScrollReveal(ref);
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
        {groups.map((group, gi) => {
          // If the accordion is used without a SectionHeader (hideHeader or no
          // title provided), the category becomes the top-level section heading
          // (h2). Otherwise it's a subsection of the h2 SectionHeader (h3).
          const isTopLevel = hideHeader || !title
          const categoryAnimation = {
            className:
              "mb-4 text-lg font-semibold text-foreground" as const,
            initial: prefersReducedMotion ? {} : { y: 8 },
            animate: prefersReducedMotion
              ? {}
              : isInView
                ? { opacity: 1, y: 0 }
                : undefined,
            transition: { duration: 0.3, delay: gi * 0.1 },
          }
          return (
            <div key={group.category ?? gi}>
              {group.category &&
                (isTopLevel ? (
                  <motion.h2 {...categoryAnimation}>{group.category}</motion.h2>
                ) : (
                  <motion.h3 {...categoryAnimation}>{group.category}</motion.h3>
                ))}
              <Accordion type="single" collapsible className="space-y-3">
                {group.items.map((item, ii) => (
                  <MotionAccordionItem
                    key={item.question}
                    value={`${gi}-${ii}`}
                    className="rounded-xl border border-border/30 dark:border-border/50 bg-white dark:bg-card px-5 transition-all hover:shadow-sm hover:shadow-primary/[0.04]"
                    initial={prefersReducedMotion ? {} : { y: 8 }}
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
          )
        })}
      </div>
    </section>
  );
}
