"use client"

import { type CSSProperties, type Ref,useEffect, useRef, useState } from "react"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

// Persists across React StrictMode's simulated remount - DOM nodes are preserved.
const playedWordReveals = new WeakSet<Element>()

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
  const ref = useRef<HTMLElement>(null)
  const [isInView, setIsInView] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const words = text.split(" ")

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (playedWordReveals.has(element)) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        playedWordReveals.add(element)
        setIsInView(true)
        observer.disconnect()
      },
      { threshold: 0, rootMargin: "-100px" },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

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
    )
  }

  return (
    <Tag
      ref={ref as Ref<HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>}
      aria-label={text}
      className={cn("flex flex-wrap", className)}
    >
      {words.map((word, i) => {
        const isHighlighted = highlightWords.some((hw) =>
          hw.toLowerCase().split(/\s+/).some(
            (part) => part === word.toLowerCase().replace(/[^a-z]/g, "")
          )
        );
        const style = {
          transform: isInView ? "translateY(0)" : "translateY(12px)",
          transitionDuration: prefersReducedMotion ? "0ms" : `${wordDuration}s`,
          transitionDelay: prefersReducedMotion ? "0ms" : `${i * staggerDelay}s`,
          transitionProperty: "transform",
          transitionTimingFunction: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        } satisfies CSSProperties

        return (
          <span
            key={i}
            className={cn(
              "inline-block mr-[0.25em] will-change-transform motion-reduce:!translate-y-0 motion-reduce:!transition-none",
              isHighlighted && highlightClassName,
            )}
            style={style}
          >
            {word}
          </span>
        )
      })}
    </Tag>
  )
}
