import { INTAKE_STATUS, type IntakeStatus } from "@/lib/data/status"
import { cn } from "@/lib/utils"

type StatusDotProps = {
  status: IntakeStatus
  className?: string
  hideLabel?: boolean
}

// Semantic dot colours. Calibrated to DESIGN.md:
// - blue (system primary) for review/processing states
// - emerald for success
// - violet for prescribing handoff
// - amber for waiting on a human
// - red for terminal / error
// - slate for inert
// Brand coral is reserved and is intentionally NOT used here.
const DOT_COLOR: Record<IntakeStatus, string> = {
  draft: "bg-slate-400",
  paid: "bg-blue-500",
  in_review: "bg-blue-500",
  pending: "bg-amber-500",
  pending_payment: "bg-amber-500",
  pending_info: "bg-amber-500",
  approved: "bg-emerald-500",
  completed: "bg-emerald-500",
  awaiting_script: "bg-violet-500",
  declined: "bg-red-500",
  escalated: "bg-red-500",
  cancelled: "bg-slate-400",
  expired: "bg-slate-400",
  disputed: "bg-red-500",
  checkout_failed: "bg-red-500",
  refunded: "bg-slate-400",
}

export function StatusDot({ status, className, hideLabel = false }: StatusDotProps) {
  const meta = INTAKE_STATUS[status]
  const label = meta?.label ?? status
  const color = DOT_COLOR[status] ?? "bg-slate-400"

  return (
    <span
      className={cn("inline-flex items-center gap-2 align-middle", className)}
      data-status={status}
    >
      <span
        data-status-dot={status}
        aria-hidden="true"
        className={cn(
          "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
          color,
        )}
      />
      {hideLabel ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="text-sm text-foreground">{label}</span>
      )}
    </span>
  )
}
