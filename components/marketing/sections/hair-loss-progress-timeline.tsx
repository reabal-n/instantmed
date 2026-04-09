"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePostHog } from "@/components/providers/posthog-provider"

interface HairLossProgressTimelineProps {
  className?: string
}

const MIN_MONTH = 0
const MAX_MONTH = 12
const DEBOUNCE_MS = 500

// Hand-authored stroke positions so we don't ship Math.random() in render.
// Spans x 60..180, y 28..46, length 6..12. Roughly 30 entries scattered across
// the top of the skull silhouette for the density morph.
const HAIR_STROKES: ReadonlyArray<{ x: number; y: number; len: number }> = [
  { x: 62, y: 38, len: 8 },
  { x: 68, y: 32, len: 9 },
  { x: 74, y: 29, len: 10 },
  { x: 80, y: 28, len: 11 },
  { x: 86, y: 28, len: 11 },
  { x: 92, y: 29, len: 10 },
  { x: 98, y: 30, len: 11 },
  { x: 104, y: 30, len: 12 },
  { x: 110, y: 29, len: 11 },
  { x: 116, y: 28, len: 12 },
  { x: 122, y: 28, len: 11 },
  { x: 128, y: 29, len: 12 },
  { x: 134, y: 30, len: 11 },
  { x: 140, y: 30, len: 10 },
  { x: 146, y: 29, len: 11 },
  { x: 152, y: 29, len: 10 },
  { x: 158, y: 30, len: 9 },
  { x: 164, y: 32, len: 8 },
  { x: 170, y: 34, len: 7 },
  { x: 176, y: 38, len: 6 },
  { x: 71, y: 42, len: 7 },
  { x: 83, y: 40, len: 8 },
  { x: 95, y: 39, len: 9 },
  { x: 107, y: 38, len: 10 },
  { x: 119, y: 38, len: 10 },
  { x: 131, y: 39, len: 9 },
  { x: 143, y: 40, len: 8 },
  { x: 155, y: 42, len: 7 },
  { x: 89, y: 46, len: 6 },
  { x: 113, y: 46, len: 6 },
  { x: 137, y: 46, len: 6 },
] as const

// Morph scalars driven by month state
function densityOpacity(month: number): number {
  return 0.35 + (month / MAX_MONTH) * 0.55 // 0.35 → 0.90
}

function strokeScale(month: number): number {
  return 0.6 + (month / MAX_MONTH) * 0.8 // 0.6 → 1.4
}

// ---------------------------------------------------------------------------
// Scalp SVG — shared between interactive and reduced-motion branches
// ---------------------------------------------------------------------------
interface ScalpSvgProps {
  month: number
  animated: boolean
  className?: string
  title: string
}

function ScalpSvg({ month, animated, className, title }: ScalpSvgProps) {
  const opacity = densityOpacity(month)
  const scale = strokeScale(month)

  return (
    <svg
      viewBox="0 0 240 160"
      role="img"
      aria-label={title}
      className={cn("h-40 w-full max-w-[480px] mx-auto", className)}
    >
      {/* Ivory background disc so the head sits on a soft surface */}
      <ellipse cx="120" cy="90" rx="92" ry="58" fill="#FFFBF2" />

      {/* Head silhouette — ivory fill, navy outline to match Norwood illustrations */}
      <ellipse
        cx="120"
        cy="86"
        rx="62"
        ry="54"
        fill="#FFFBF2"
        stroke="#0B1F3A"
        strokeWidth="2"
      />

      {/* Hair density group — the single morph target */}
      <motion.g
        initial={false}
        animate={
          animated
            ? {
                opacity,
                scaleY: scale,
              }
            : undefined
        }
        style={
          animated
            ? { transformOrigin: "120px 30px" }
            : {
                opacity,
                transform: `scaleY(${scale})`,
                transformOrigin: "120px 30px",
              }
        }
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
        stroke="#0B1F3A"
        strokeLinecap="round"
      >
        {HAIR_STROKES.map((s, i) => (
          <line
            key={i}
            x1={s.x}
            y1={s.y}
            x2={s.x}
            y2={s.y - s.len}
            strokeWidth={1.6}
          />
        ))}
      </motion.g>

      {/* Subtle face hint — two eyes and a mouth line, low-opacity so they don't distract */}
      <g fill="#0B1F3A" opacity={0.55}>
        <circle cx="102" cy="92" r="2" />
        <circle cx="138" cy="92" r="2" />
      </g>
      <path
        d="M108 112 Q 120 118 132 112"
        fill="none"
        stroke="#0B1F3A"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={0.55}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Static reduced-motion branch — three snapshots side-by-side
// ---------------------------------------------------------------------------
function StaticSnapshots() {
  const snapshots: Array<{ month: number; label: string }> = [
    { month: 0, label: "Month 0" },
    { month: 6, label: "Month 6" },
    { month: 12, label: "Month 12" },
  ]
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {snapshots.map((snap) => (
        <div key={snap.month} className="flex flex-col items-center gap-2">
          <ScalpSvg
            month={snap.month}
            animated={false}
            title={`Hair density at ${snap.label}`}
            className="h-32"
          />
          <p className="text-sm font-medium text-foreground">{snap.label}</p>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function HairLossProgressTimeline({
  className,
}: HairLossProgressTimelineProps) {
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()

  const [month, setMonth] = useState<number>(MIN_MONTH)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleMonthChange = (next: number) => {
    setMonth(next)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      posthog?.capture("hair_loss_timeline_scrubbed", { month: next })
    }, DEBOUNCE_MS)
  }

  const handleCtaClick = () => {
    posthog?.capture("hair_loss_timeline_cta_clicked", { month })
  }

  return (
    <section
      aria-label="Hair loss treatment progress timeline"
      className={cn("py-12 lg:py-16", className)}
    >
      <div className="mx-auto w-full max-w-[720px] px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:bg-card",
            "p-5 sm:p-7 lg:p-8",
          )}
        >
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              What treatment progress looks like
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-sm leading-relaxed text-muted-foreground">
              Scrub through the first 12 months to see what most patients
              experience on consistent treatment. Progress is gradual — and
              that&apos;s a feature, not a bug.
            </p>
          </div>

          {prefersReducedMotion ? (
            <div className="mt-6">
              <StaticSnapshots />
            </div>
          ) : (
            <>
              <div className="mt-6">
                <ScalpSvg
                  month={month}
                  animated
                  title={`Hair density at month ${month}`}
                />
              </div>

              <div className="relative mt-8">
                {/* Milestone pills sitting above the track */}
                <div className="pointer-events-none absolute inset-x-0 -top-2 h-0">
                  <div
                    className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    style={{ left: "25%" }}
                  >
                    Shedding often stabilises.
                  </div>
                  <div
                    className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    style={{ left: "50%" }}
                  >
                    Initial regrowth in the mirror.
                  </div>
                  <div
                    className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    style={{ left: "100%" }}
                  >
                    Full treatment window.
                  </div>
                </div>

                <input
                  id="hair-loss-progress-month"
                  type="range"
                  min={MIN_MONTH}
                  max={MAX_MONTH}
                  step={1}
                  value={month}
                  onChange={(e) => handleMonthChange(Number(e.target.value))}
                  aria-label="Treatment progress timeline — month"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />

                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Month {MIN_MONTH}</span>
                  <span>Month {MAX_MONTH}</span>
                </div>
              </div>

              <p className="mt-4 text-center text-sm font-medium text-foreground">
                Month {month}
              </p>
            </>
          )}

          <div className="mt-7 flex justify-center">
            <Button asChild size="lg" onClick={handleCtaClick}>
              <Link href="/request?service=consult&subtype=hair_loss">
                Start assessing your progress
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
