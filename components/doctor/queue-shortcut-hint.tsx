"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const DISMISS_KEY = "instantmed.queue-shortcuts.dismissed"

/**
 * Small dismissible caption above the doctor queue surfacing the keyboard
 * shortcuts power users already rely on (a/d/j/k/CmdK). Calm chrome: muted
 * text only, neutral kbd backdrops, no colored badges. Hidden below `lg` so
 * mobile and tablet operators never see it (no keyboard).
 *
 * Defaults to hidden until the client effect reads localStorage so SSR
 * doesn't flash the strip before we know whether it's been dismissed.
 */
export function QueueShortcutHint({ className }: { className?: string }) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed) return null

  return (
    <div
      className={cn(
        "hidden items-center justify-between gap-3 px-3 py-2 text-[11px] text-muted-foreground lg:flex",
        className,
      )}
      aria-label="Keyboard shortcuts"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">a</kbd>{" "}
          approve
        </span>
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">d</kbd>{" "}
          decline
        </span>
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">j</kbd>
          /
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">k</kbd>{" "}
          navigate
        </span>
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>{" "}
          command palette
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(DISMISS_KEY, "1")
          } catch {
            // localStorage may be blocked in private windows. Fine, we just
            // won't persist the dismissal across reloads.
          }
          setDismissed(true)
        }}
        className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Hide keyboard shortcuts"
      >
        Hide
      </button>
    </div>
  )
}
