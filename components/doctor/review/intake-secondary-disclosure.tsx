"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { type ReactNode,useState } from "react"

import { cn } from "@/lib/utils"

interface IntakeSecondaryDisclosureProps {
  /** True count of clinical-history requests except the active request. */
  totalOtherRequestCount: number
  /** Number of recent other-request rows included in this bounded payload. */
  visibleOtherRequestCount: number
  noteCount: number
  defaultOpen?: boolean
  /** Controlled-mode open state. When provided, the parent owns the open state. */
  open?: boolean
  /** Fires whenever the disclosure toggles (controlled or uncontrolled). */
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

/**
 * Bottom-of-cockpit disclosure for bounded recent patient history. Closed by
 * default so the canonical current-request packet stays primary; complete
 * source data remains available through the panel's Open full record action.
 */
export function IntakeSecondaryDisclosure({
  totalOtherRequestCount,
  visibleOtherRequestCount,
  noteCount,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: IntakeSecondaryDisclosureProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen

  const toggle = () => {
    const next = !open
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const countLabels = [
    totalOtherRequestCount > 0
      ? `${totalOtherRequestCount} other request${totalOtherRequestCount === 1 ? "" : "s"}`
      : null,
    noteCount > 0 ? `${noteCount} note${noteCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean)
  const label = ["Recent history", ...countLabels].join(" · ")
  const isRequestHistoryCapped =
    visibleOtherRequestCount > 0 && totalOtherRequestCount > visibleOtherRequestCount

  return (
    <div className="border-t border-border/40 pt-3">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-8",
          open && "text-foreground",
        )}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        {open ? "Hide recent history" : label}
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          {isRequestHistoryCapped ? (
            <p className="px-1 text-xs text-muted-foreground">
              Showing the latest {visibleOtherRequestCount} of {totalOtherRequestCount} other requests.
              {" "}Open full record for the complete history.
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  )
}
