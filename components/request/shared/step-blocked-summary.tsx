"use client"

import { useEffect, useRef } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"

/**
 * Top-of-step "why isn't Continue advancing" summary.
 *
 * The canonical fix for the silent disabled-CTA anti-pattern: the primary action
 * stays clickable, a blocked tap runs validate() and sets `reasons`, and this
 * announces them (aria-live) instead of leaving a greyed button with no
 * explanation — which on mobile (where the sticky CTA mirrors the button) reads
 * as a dead end. Mirrors the inline pattern already in patient-details-step and
 * symptoms-step; use this so every step surfaces blockers consistently.
 *
 * `reasons` are the per-field validation messages (e.g. "Please select a start
 * date"). Renders nothing when empty.
 *
 * Scroll-into-view: this summary sits at the TOP of the step while the (sticky)
 * Continue button is at the BOTTOM. Without scrolling, a mobile user who taps a
 * blocked CTA sees nothing happen — the error is off-screen above them. When
 * reasons transition empty -> non-empty we scroll/focus it into view (review
 * 2026-06-11; the earlier scroll fix only shipped to patient-details-step).
 */
export function StepBlockedSummary({ reasons }: { reasons: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const hadReasons = useRef(false)

  useEffect(() => {
    const hasReasons = reasons.length > 0
    if (hasReasons && !hadReasons.current && ref.current) {
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ref.current.scrollIntoView({
        block: "center",
        behavior: prefersReduced ? "auto" : "smooth",
      })
      ref.current.focus({ preventScroll: true })
    }
    hadReasons.current = hasReasons
  }, [reasons])

  if (reasons.length === 0) return null

  // Wrapper div carries the ref/focus target (Alert is a plain function
  // component, not forwardRef, so a ref would not attach to it).
  return (
    <div ref={ref} tabIndex={-1} className="scroll-mt-24 outline-none">
      <Alert variant="destructive" role="alert" aria-live="assertive">
        <AlertDescription>
          {reasons.length === 1 ? (
            reasons[0]
          ) : (
            <>
              <span className="font-medium">A few things to finish:</span>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
