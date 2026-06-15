import { attentionFlags, type IntakeFlag } from "@/lib/clinical/intake-flags"
import { cn } from "@/lib/utils"

/**
 * Doctor-facing surface for intake flags (softened intake gaps the form let
 * through). Calm chrome per the staff-list convention: 8px semantic dot + plain
 * text, no colored-background pills. Attention = amber (act on it), info = slate
 * (context). Callers pass `parseIntakeFlags(intake.risk_flags)`.
 */

/**
 * Compact queue/ledger-row badge. Renders ONLY when there is at least one
 * attention-severity flag (info flags do not earn a row badge). Count + amber
 * dot, with the flag labels in the tooltip; the full detail lives in the panel.
 */
export function IntakeFlagsBadge({ flags, className }: { flags: IntakeFlag[]; className?: string }) {
  const attention = attentionFlags(flags)
  if (attention.length === 0) return null

  const label = attention.length === 1 ? attention[0].label : `${attention.length} flags for review`

  return (
    <span
      data-intake-flags-badge=""
      className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}
      title={attention.map((flag) => (flag.detail ? `${flag.label}: ${flag.detail}` : flag.label)).join("\n")}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
      {label}
    </span>
  )
}

/**
 * Full "Needs doctor attention" panel for the intake detail page. Lists every
 * flag (attention first, then info). Renders nothing when there are no flags.
 */
export function IntakeFlagsPanel({ flags, className }: { flags: IntakeFlag[]; className?: string }) {
  if (flags.length === 0) return null

  const ordered = [...attentionFlags(flags), ...flags.filter((flag) => flag.severity === "info")]

  return (
    <section
      data-intake-flags-panel=""
      className={cn(
        "rounded-2xl border border-border/50 bg-white p-4 shadow-md shadow-primary/[0.06] dark:bg-card dark:shadow-none",
        className,
      )}
    >
      <h3 className="text-sm font-medium text-foreground">Needs doctor attention</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        The form let these through so the patient could finish: your call on each.
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
