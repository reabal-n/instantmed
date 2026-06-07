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
 */
export function StepBlockedSummary({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null

  return (
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
  )
}
