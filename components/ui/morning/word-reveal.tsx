"use client";

import { motion } from "framer-motion";
import { useRef } from "react";

import { useReducedMotion,useScrollReveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

// Persists across React StrictMode's simulated remount - DOM nodes are preserved.
const _played = new WeakSet<Element>()

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
  wordDuration = 0.3,
}: WordRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useScrollReveal(ref);
  const prefersReducedMotion = useReducedMotion();

  if (isInView && ref.current) _played.add(ref.current)
  const alreadyPlayed = ref.current != null && _played.has(ref.current)
  const shouldAnimate = alreadyPlayed || isInView

  const words = text.split(" ");

  if (prefersReducedMotion) {
    return (
      <Tag className={className}>
        {words.map((word, i) => {
          const isHighlighted = highlightWords.some((hw) =>
            hw.toLowerCase().split(/\s+/).some(
              (part) => part === word.toLowerCase().replace(/[^a-z]/g, "")
            )
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
    <Tag ref={ref} aria-label={text} className={cn("flex flex-wrap", className)}>
      {words.map((word, i) => {
        const isHighlighted = highlightWords.some((hw) =>
          hw.toLowerCase().split(/\s+/).some(
            (part) => part === word.toLowerCase().replace(/[^a-z]/g, "")
          )
        );
        return (
          <motion.span
            key={i}
            className={cn("inline-block mr-[0.25em]", isHighlighted && highlightClassName)}
            initial={alreadyPlayed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
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
