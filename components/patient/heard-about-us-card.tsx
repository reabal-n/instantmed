"use client"

import { Check, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { HEARD_ABOUT_US_OPTIONS } from "@/lib/analytics/heard-about-us"
import { cn } from "@/lib/utils"

type CardState = "idle" | "submitting" | "done" | "dismissed"

/**
 * Self-reported attribution survey — one optional question shown post-payment on
 * the success page (logged-in) and the guest complete-account page. The only way
 * to attribute referrer-stripped traffic (LLM apps, word-of-mouth, forums).
 *
 * Post-payment placement = zero checkout-conversion risk. Writes once via the
 * token-authed /api/attribution/heard route. Fires PostHog `shown`/`answered`
 * events so the answer rate is measurable from day one.
 */
export function HeardAboutUsCard({
  token,
  className,
}: {
  token: string
  className?: string
}) {
  const posthog = usePostHog()
  const [state, setState] = useState<CardState>("idle")
  const [selected, setSelected] = useState<string | null>(null)
  const shownFired = useRef(false)

  useEffect(() => {
    if (!token || shownFired.current) return
    shownFired.current = true
    posthog?.capture("heard_about_us_shown")
  }, [token, posthog])

  if (!token || state === "dismissed") return null

  async function choose(value: string) {
    if (state === "submitting" || state === "done") return
    setSelected(value)
    setState("submitting")
    posthog?.capture("heard_about_us_answered", { value })
    try {
      await fetch("/api/attribution/heard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, value }),
      })
    } catch {
      // Best-effort acquisition metadata — still thank the patient.
    }
    setState("done")
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-white dark:bg-card p-5 shadow-sm shadow-primary/[0.04]",
        className,
      )}
    >
      {state === "done" ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-light text-success">
            <Check className="h-3.5 w-3.5" />
          </span>
          Thanks — that really helps us reach more people.
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Quick question
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                How did you find us?
              </p>
            </div>
            <button
              type="button"
              onClick={() => setState("dismissed")}
              aria-label="Dismiss question"
              className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {HEARD_ABOUT_US_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={state === "submitting"}
                aria-pressed={selected === option.value}
                onClick={() => choose(option.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  "border-border/60 bg-background hover:border-primary/40 hover:bg-primary/5",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  selected === option.value && "border-primary/50 bg-primary/10 text-foreground",
                )}
              >
                <span aria-hidden>{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
