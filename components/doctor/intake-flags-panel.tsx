import {
  attentionFlags,
  type IntakeFlag,
  withoutRequestPacketFlags,
} from "@/lib/clinical/intake-flags"
import { cn } from "@/lib/utils"

/**
 * Doctor-facing surface for intake flags (softened intake gaps the form let
 * through). Calm chrome per the staff-list convention: 8px semantic dot + plain
 * text, no colored-background pills. Attention = amber (act on it), info = slate
 * (context). Callers pass `parseIntakeFlags(intake.risk_flags)`.
 */

/**
 * Compact queue/ledger-row badge. Attention flags receive an amber action cue.
 * Auto-approval engine context receives a quieter slate cue because the active
 * med-cert protocol still routes it to a doctor. Routine intake info omissions
 * remain panel-only so optional fields do not create queue noise.
 */
export function IntakeFlagsBadge({
  flags,
  className,
  compact = false,
}: {
  flags: IntakeFlag[]
  className?: string
  compact?: boolean
}) {
  const attention = attentionFlags(flags)
  const engineContext = flags.filter((flag) => (
    flag.severity === "info" && flag.source === "auto_approval"
  ))
  if (attention.length === 0 && engineContext.length === 0) return null

  const visibleFlags = attention.length > 0 ? attention : engineContext
  const label = attention.length > 0
    ? compact
      ? (attention.length === 1 ? "Check detail" : `${attention.length} details`)
      : (attention.length === 1 ? attention[0].label : `${attention.length} flags for review`)
    : "Review context"

  return (
    <span
      data-intake-flags-badge=""
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
      title={visibleFlags.map((flag) => (flag.detail ? `${flag.label}: ${flag.detail}` : flag.label)).join("\n")}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          attention.length > 0 ? "bg-amber-500" : "bg-slate-400",
        )}
        aria-hidden
      />
      {label}
    </span>
  )
}

/**
 * Full "Needs doctor attention" panel for the intake detail page. Lists every
 * flag (attention first, then info). Renders nothing when there are no flags.
 */
export function IntakeFlagsPanel({
  flags,
  className,
  hideRequestFieldFlags = false,
}: {
  flags: IntakeFlag[]
  className?: string
  hideRequestFieldFlags?: boolean
}) {
  const visibleFlags = hideRequestFieldFlags ? withoutRequestPacketFlags(flags) : flags
  if (visibleFlags.length === 0) return null

  const needsAttention = attentionFlags(visibleFlags).length > 0
  const ordered = [
    ...attentionFlags(visibleFlags),
    ...visibleFlags.filter((flag) => flag.severity === "info"),
  ]

  return (
    <section
      data-intake-flags-panel=""
      className={cn(
        "rounded-2xl border border-border/50 bg-white p-4 shadow-md shadow-primary/[0.06] dark:bg-card dark:shadow-none",
        className,
      )}
    >
      <h3 className="text-sm font-medium text-foreground">
        {needsAttention ? "Needs doctor attention" : "Review context"}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {needsAttention
          ? "Check these details before deciding."
          : "Extra context from the patient’s request."}
      </p>
      <ul className="mt-3 space-y-2">
        {ordered.map((flag, index) => (
          <li key={`${flag.code}-${index}`} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden
              className={cn(
                "mt-1.5 h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
                flag.severity === "attention" ? "bg-amber-500" : "bg-slate-400",
              )}
            />
            <span className="text-foreground">
              {flag.label}
              {flag.detail ? <span className="text-muted-foreground">: {flag.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
