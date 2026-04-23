"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

interface ErrorRefChipProps {
  digest?: string
  className?: string
}

/**
 * Chip displaying an error reference ID with a copy-to-clipboard affordance.
 * Renders nothing when no digest is provided — safe to use unconditionally.
 */
export function ErrorRefChip({ digest, className }: ErrorRefChipProps) {
  const [copied, setCopied] = useState(false)

  if (!digest) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(digest)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard permission denied or unsupported — silently ignore.
    }
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-xl bg-muted/50 font-mono text-xs text-muted-foreground",
        className,
      )}
    >
      <span>Ref: {digest}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label={copied ? "Copied error reference" : "Copy error reference"}
        aria-live="polite"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" aria-hidden="true" />
            Copy
          </>
        )}
      </button>
    </div>
  )
}
