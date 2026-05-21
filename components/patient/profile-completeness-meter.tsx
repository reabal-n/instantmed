import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { PATIENT_SETTINGS_HREF } from "@/lib/dashboard/routes"
import type { PatientProfileCompleteness } from "@/lib/data/patient-completeness"
import { cn } from "@/lib/utils"

interface ProfileCompletenessMeterProps {
  completeness: PatientProfileCompleteness
  /** Override the click target. Defaults to the patient settings page. */
  href?: string
  className?: string
}

/**
 * Compact one-line meter that nudges the patient toward a fully filled
 * profile. Source of truth for the math is
 * `lib/data/patient-completeness.ts`. The meter self-hides when the
 * profile is 100% complete so we never nag fully-filled accounts.
 *
 * Calm chrome: card surface only, no coral, progress bar uses the system
 * primary as a data indicator (not a status pill).
 */
export function ProfileCompletenessMeter({
  completeness,
  href,
  className,
}: ProfileCompletenessMeterProps) {
  if (completeness.isComplete) return null

  const { filled, total, ratio } = completeness
  const widthPercent = Math.max(0, Math.min(1, ratio)) * 100
  const target = href ?? PATIENT_SETTINGS_HREF

  return (
    <Link
      href={target}
      aria-label={`Your profile is ${filled} of ${total} fields complete. Click to finish.`}
      className={cn(
        "block rounded-xl border border-border/50 bg-card p-4",
        "shadow-sm shadow-primary/[0.04] transition-colors hover:bg-accent/30",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Your profile</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {filled} of {total} complete · finish in ~30 seconds
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <div
        className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={filled}
      >
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${widthPercent}%` }}
          aria-hidden="true"
        />
      </div>
    </Link>
  )
}
