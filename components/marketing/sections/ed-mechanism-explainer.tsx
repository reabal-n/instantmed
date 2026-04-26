"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/ui/reveal"
import { cn } from "@/lib/utils"

interface EdMechanismExplainerProps {
  className?: string
}

// =============================================================================
// FRAME SVGs (inline - never external files)
// =============================================================================

/** Frame 1: Baseline vessel - narrow lumen, minimal flow lines */
function BaselineVesselSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-40 w-auto text-muted-foreground"
      role="img"
      aria-label="Baseline vessel illustration showing low blood flow"
    >
      {/* Vessel walls (top + bottom parallel rounded lines) */}
      <path
        d="M20 78 Q100 72 180 78"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M20 122 Q100 128 180 122"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Three thin flow dashes */}
      <line x1="45" y1="100" x2="65" y2="100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="90" y1="100" x2="110" y2="100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="135" y1="100" x2="155" y2="100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {/* Label */}
      <text
        x="100"
        y="160"
        textAnchor="middle"
        className="fill-current"
        fontSize="12"
        fontWeight="500"
        opacity="0.7"
      >
        Baseline
      </text>
    </svg>
  )
}

/** Frame 2: Response vessel - wider lumen, thicker flow lines in primary */
function ResponseVesselSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="h-40 w-auto"
      role="img"
      aria-label="Treatment response vessel illustration showing enhanced blood flow"
    >
      {/* Vessel walls - wider gap */}
      <path
        d="M20 66 Q100 60 180 66"
        fill="none"
        className="stroke-muted-foreground"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M20 134 Q100 140 180 134"
        fill="none"
        className="stroke-muted-foreground"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Five thicker primary flow dashes */}
      <line x1="30" y1="100" x2="55" y2="100" className="stroke-primary" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="65" y1="100" x2="90" y2="100" className="stroke-primary" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="100" y1="100" x2="125" y2="100" className="stroke-primary" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="135" y1="100" x2="160" y2="100" className="stroke-primary" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="170" y1="100" x2="185" y2="100" className="stroke-primary" strokeWidth="3.5" strokeLinecap="round" />
      {/* Label */}
      <text
        x="100"
        y="170"
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize="12"
        fontWeight="500"
        opacity="0.7"
      >
        Response
      </text>
    </svg>
  )
}

/** Frame 3: Duration window - two timeline bars showing short-acting vs daily options */
function DurationTimelineSvg() {
  return (
    <svg
      viewBox="0 0 240 200"
      className="h-40 w-auto"
      role="img"
      aria-label="Duration comparison: as-needed (4 to 6 hours) versus daily (up to 36 hours)"
    >
      {/* As-needed bar */}
      <text x="20" y="62" className="fill-muted-foreground" fontSize="10" fontWeight="500" opacity="0.8">As-needed</text>
      <rect x="20" y="68" width="200" height="12" rx="6" className="fill-muted" />
      <rect x="30" y="68" width="80" height="12" rx="6" className="fill-primary" opacity="0.7" />
      <text x="20" y="94" className="fill-muted-foreground" fontSize="9" opacity="0.6">0h</text>
      <text x="110" y="94" textAnchor="middle" className="fill-muted-foreground" fontSize="9" opacity="0.6">4-6h</text>
      <text x="220" y="94" textAnchor="end" className="fill-muted-foreground" fontSize="9" opacity="0.6">36h</text>

      {/* Daily bar */}
      <text x="20" y="118" className="fill-muted-foreground" fontSize="10" fontWeight="500" opacity="0.8">Daily</text>
      <rect x="20" y="124" width="200" height="12" rx="6" className="fill-muted" />
      <rect x="20" y="124" width="200" height="12" rx="6" className="fill-primary" opacity="0.5" />
      <text x="20" y="150" className="fill-muted-foreground" fontSize="9" opacity="0.6">0h</text>
      <text x="220" y="150" textAnchor="end" className="fill-muted-foreground" fontSize="9" opacity="0.6">36h</text>

      {/* Label */}
      <text
        x="120"
        y="178"
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize="11"
        fontWeight="500"
        opacity="0.7"
      >
        Duration depends on type
      </text>
    </svg>
  )
}

// =============================================================================
// FRAMES DATA
// =============================================================================

const FRAMES = [
  {
    id: "baseline",
    svg: <BaselineVesselSvg />,
    label:
      "When arousal signals reach the body, the baseline response can be weaker than expected.",
  },
  {
    id: "response",
    svg: <ResponseVesselSvg />,
    label:
      "Oral treatment enhances the natural signal pathway - more blood flow to the area when you're aroused.",
  },
  {
    id: "duration",
    svg: <DurationTimelineSvg />,
    label:
      "Different oral treatments have different onset and duration windows. A doctor decides which fits your pattern.",
  },
] as const

// =============================================================================
// COMPONENT
// =============================================================================

export function EdMechanismExplainer({ className }: EdMechanismExplainerProps) {
  const posthog = usePostHog()

  const sectionRef = useRef<HTMLElement>(null)
  const viewedFiredRef = useRef(false)

  // Fire `ed_mechanism_viewed` once when the section enters the viewport.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewedFiredRef.current) {
          viewedFiredRef.current = true
          posthog?.capture("ed_mechanism_viewed")
          observer.disconnect()
        }
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [posthog])

  const handleCtaClick = () => {
    posthog?.capture("ed_mechanism_cta_clicked")
  }

  return (
    <section
      ref={sectionRef}
      aria-label="How oral ED treatment works"
      className={cn("py-12 lg:py-16", className)}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            How oral ED treatment works
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            A quick visual explainer. No anatomy textbook required.
          </p>
        </div>

        {/* Frames grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {FRAMES.map((frame, i) => (
            <Reveal
              key={frame.id}
              instant={i < 2}
              delay={i * 0.1}
              className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-6"
            >
              <div className="h-40 w-full flex items-center justify-center">
                {frame.svg}
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed text-center">
                {frame.label}
              </p>
            </Reveal>
          ))}
        </div>

        {/* Primary CTA */}
        <div className="mt-10 flex justify-center">
          <Button
            asChild
            size="lg"
            className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-[transform,box-shadow] active:scale-[0.98]"
            onClick={handleCtaClick}
          >
            <Link href="/request?service=consult&subtype=ed">
              Start your assessment
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
