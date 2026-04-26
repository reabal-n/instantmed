"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { useReducedMotion } from "@/components/ui/motion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogoItem {
  name: string
  src: string
}

export interface ScrollingLogoMarqueeProps {
  logos: LogoItem[]
  /** Heading text above the marquee. Omit for no heading. */
  heading?: string
  /** Hide the heading but keep logos */
  hideHeading?: boolean
  /** Animation speed */
  speed?: "slow" | "normal" | "fast"
  /** Show logos in full color instead of grayscale */
  colored?: boolean
  /** Tooltip prefix (e.g., "Accepted by" renders "Accepted by {name}") */
  tooltipPrefix?: string
  /** Analytics event name for view tracking */
  analyticsEvent?: string
  className?: string
}

// ---------------------------------------------------------------------------
// Speed mapping
// ---------------------------------------------------------------------------

const SPEED_CLASS: Record<string, string> = {
  slow: "animate-marquee-slow",
  normal: "animate-marquee",
  fast: "animate-marquee-fast",
}

// ---------------------------------------------------------------------------
// Internal logo row
// ---------------------------------------------------------------------------

function LogoRow({
  logos,
  tooltipPrefix,
  colored,
  className,
}: {
  logos: LogoItem[]
  tooltipPrefix?: string
  colored?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-10 shrink-0", className)}>
      <TooltipProvider delayDuration={200}>
        {logos.map((logo, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div className="shrink-0 h-8 w-24 flex items-center justify-center">
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={96}
                  height={32}
                  className={cn(
                    "object-contain h-6 w-auto transition-[opacity,filter] duration-300",
                    colored
                      ? "opacity-60 hover:opacity-90"
                      : "opacity-40 grayscale hover:opacity-70 hover:grayscale-0 dark:brightness-150 dark:contrast-75",
                  )}
                  unoptimized={logo.src.endsWith(".svg")}
                />
              </div>
            </TooltipTrigger>
            {tooltipPrefix && (
              <TooltipContent side="bottom" className="text-xs">
                {tooltipPrefix} {logo.name}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScrollingLogoMarquee({
  logos,
  heading,
  hideHeading,
  speed = "normal",
  colored,
  tooltipPrefix,
  analyticsEvent,
  className,
}: ScrollingLogoMarqueeProps) {
  const prefersReducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLDivElement>(null)
  const posthog = usePostHog()
  const tracked = useRef(false)

  useEffect(() => {
    if (!analyticsEvent) return
    const el = sectionRef.current
    if (!el || tracked.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true
          posthog?.capture(analyticsEvent, { page: window.location.pathname })
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [posthog, analyticsEvent])

  const showHeading = heading && !hideHeading

  // Reduced motion: static wrapped grid
  if (prefersReducedMotion) {
    return (
      <div ref={sectionRef} className={cn("py-8", className)}>
        {showHeading && (
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            {heading}
          </p>
        )}
        <div className="flex flex-wrap justify-center items-center gap-6 px-4 max-w-4xl mx-auto">
          {logos.map((logo) => (
            <div key={logo.name} className="shrink-0 h-8 w-24 flex items-center justify-center">
              <Image
                src={logo.src}
                alt={logo.name}
                width={96}
                height={32}
                className={cn(
                  "object-contain h-6 w-auto",
                  colored
                    ? "opacity-60"
                    : "opacity-40 grayscale dark:brightness-150 dark:contrast-75",
                )}
                unoptimized={logo.src.endsWith(".svg")}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={sectionRef} className={cn("py-8", className)}>
      {showHeading && (
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          {heading}
        </p>
      )}
      <div
        className="relative overflow-hidden group/marquee"
        role="marquee"
        aria-label={heading || "Logo marquee"}
      >
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

        <div
          className={cn(
            "flex w-max group-hover/marquee:[animation-play-state:paused]",
            SPEED_CLASS[speed] ?? SPEED_CLASS.normal
          )}
        >
          <LogoRow logos={logos} tooltipPrefix={tooltipPrefix} colored={colored} className="px-5" />
          <LogoRow logos={logos} tooltipPrefix={tooltipPrefix} colored={colored} className="px-5" />
        </div>
      </div>
    </div>
  )
}
