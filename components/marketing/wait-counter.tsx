import type { WaitState } from "@/lib/brand/wait-counter-types"
import { buildMedCertSpeedClaimFromWaitState } from "@/lib/marketing/speed-claims"
import { cn } from "@/lib/utils"

interface WaitCounterProps {
  state: WaitState
  variant?: "inline" | "standalone"
  className?: string
}

/** Historical turnaround, never a personal queue position or a promise. */
export function WaitCounter({ state, variant = "inline", className }: WaitCounterProps) {
  if (state.variant === "reviewing") return <span className={cn("text-sm text-muted-foreground", className)}>Requests open 24/7</span>
  if (buildMedCertSpeedClaimFromWaitState(state).status !== "under_hour") return null
  return (
    <span className={cn("inline-flex items-start gap-2 text-sm leading-6 text-muted-foreground", variant === "standalone" && "sm:text-base", className)}>
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
      <span>Medical certificates: median turnaround <strong className="font-semibold tabular-nums text-foreground">~{state.medianMinutes} min</strong> over the last 24 hours</span>
    </span>
  )
}
