import { cn } from "@/lib/utils"

interface SlaChipProps {
  paidAt: string | null | undefined
  className?: string
}

type Tone = "success" | "warning" | "critical" | "neutral"

// Semantic dot colours match the calm-chrome cockpit palette used by
// `StatusDot`: emerald for healthy, amber for approaching SLA, red for
// breached, slate for inert. 24h is the operator-stated SLA ceiling for
// review timing (see CLAUDE.md Hours).
const DOT_COLOR: Record<Tone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  neutral: "bg-slate-400",
}

const LABEL_COLOR: Record<Tone, string> = {
  success: "text-muted-foreground",
  warning: "text-muted-foreground",
  critical: "text-red-600 dark:text-red-400 font-medium",
  neutral: "text-muted-foreground",
}

function formatRelative(diffMs: number): string {
  if (diffMs < 60_000) return "Paid just now"
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `Paid ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  const remainderMin = minutes % 60
  if (hours < 24) {
    return remainderMin > 0 && hours < 4
      ? `Paid ${hours}h ${remainderMin}m ago`
      : `Paid ${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return days === 1 ? "Paid 1d ago" : `Paid ${days}d ago`
}

function toneFor(diffMs: number): Tone {
  const hours = diffMs / 3_600_000
  if (hours < 4) return "success"
  if (hours < 24) return "warning"
  return "critical"
}

/**
 * SLA chip rendered next to the patient name on the intake slide header.
 * Shows how long since the intake was paid with a calm-chrome 8px dot
 * coloured against the 24h review SLA. Uses the same dot visual primitive
 * as `StatusDot` (`components/operator/cases/status-dot.tsx`) so the
 * cockpit reads as one system.
 */
export function SlaChip({ paidAt, className }: SlaChipProps) {
  if (!paidAt) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 align-middle text-xs text-muted-foreground",
          className,
        )}
        data-testid="sla-chip"
        data-tone="neutral"
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
            DOT_COLOR.neutral,
          )}
        />
        Not paid
      </span>
    )
  }

  const paidAtDate = new Date(paidAt)
  const diffMs = Date.now() - paidAtDate.getTime()
  const safeDiffMs = Number.isFinite(diffMs) && diffMs >= 0 ? diffMs : 0
  const tone = toneFor(safeDiffMs)
  const label = formatRelative(safeDiffMs)
  const title = paidAtDate.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 align-middle text-xs", className)}
      data-testid="sla-chip"
      data-tone={tone}
      title={`Paid at ${title}`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
          DOT_COLOR[tone],
        )}
      />
      <span className={LABEL_COLOR[tone]}>{label}</span>
    </span>
  )
}
