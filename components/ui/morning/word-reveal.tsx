"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { scrollRevealConfig, useReducedMotion } from "@/components/ui/motion";

interface WordRevealProps {
  text: string;
  className?: string;
  highlightWords?: string[];
  highlightClassName?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  staggerDelay?: number;
  wordDuration?: number;
}

export function WordReveal({
  text,
  className,
  highlightWords = [],
  highlightClassName = "text-primary",
  as: Tag = "h2",
  staggerDelay = 0.06,
  wordDuration = 0.4,
}: WordRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    margin: scrollRevealConfig.margin as `${number}px`,
    amount: scrollRevealConfig.threshold,
  });
  const prefersReducedMotion = useReducedMotion();

  const words = text.split(" ");

  if (prefersReducedMotion) {
    return (
      <Tag className={className}>
        {words.map((word, i) => {
          const isHighlighted = highlightWords.some(
            (hw) => hw.toLowerCase() === word.toLowerCase().replace(/[^a-z]/g, "")
          );
          return (
            <span key={i}>
              {isHighlighted ? (
                <span className={highlightClassName}>{word}</span>
              ) : (
                word
              )}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </Tag>
    );
  }

  return (
    <Tag ref={ref} className={cn("flex flex-wrap", className)}>
      {words.map((word, i) => {
        const isHighlighted = highlightWords.some(
          (hw) => hw.toLowerCase() === word.toLowerCase().replace(/[^a-z]/g, "")
        );
        return (
          <motion.span
            key={i}
            className={cn("inline-block mr-[0.25em]", isHighlighted && highlightClassName)}
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : undefined}
            transition={{
              duration: wordDuration,
              delay: i * staggerDelay,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {word}
          </motion.span>
        );
      })}
    </Tag>
  );
}
