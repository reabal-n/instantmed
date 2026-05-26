"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { type ReactNode,useState } from "react"

import { cn } from "@/lib/utils"

interface IntakeSecondaryDisclosureProps {
  priorRequestCount: number
  noteCount: number
  defaultOpen?: boolean
  /** Controlled-mode open state. When provided, the parent owns the open state. */
  open?: boolean
  /** Fires whenever the disclosure toggles (controlled or uncontrolled). */
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

/**
 * Bottom-of-cockpit disclosure that hides the clinical notes editor and
 * the unified patient timeline behind a single click. Closed by default
 * so the operator sees the patient facts and recommended prescription
 * first; the Cmd+N shortcut opens this disclosure before focusing the
 * notes textarea so notes are never unreachable.
 */
export function IntakeSecondaryDisclosure({
  priorRequestCount,
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

  const label = `Show full intake · ${priorRequestCount} prior request${priorRequestCount === 1 ? "" : "s"} · ${noteCount} note${noteCount === 1 ? "" : "s"}`

  return (
    <div className="border-t border-border/40 pt-3">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
          open && "text-foreground",
        )}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        )}
        {open ? "Hide full intake" : label}
      </button>
      {open ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  )
}
