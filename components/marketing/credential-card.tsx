import { ExternalLink, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"

interface CredentialCardProps {
  className?: string
  /** Compact variant for sidebar / dense layouts */
  compact?: boolean
}

/**
 * Premium AHPRA credential card.
 *
 * Communicates that all reviewing doctors are AHPRA-registered without naming
 * a specific individual (per brand rule: no doctor names on marketing surfaces).
 *
 * Trust comes from verifiability: the card links directly to AHPRA's public
 * register at ahpra.gov.au where anyone can confirm credentials. That's the
 * difference between a trust badge and a trust signal that holds up.
 */
export function CredentialCard({ className, compact = false }: CredentialCardProps) {
  return (
    <a
      href="https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-3",
        "rounded-xl bg-white dark:bg-card",
        "border border-border/60 dark:border-white/10",
        "shadow-sm shadow-primary/[0.04] hover:shadow-md hover:shadow-primary/[0.08]",
        "hover:border-primary/30 dark:hover:border-primary/40",
        "transition-[box-shadow,border-color] duration-200",
        compact ? "px-3 py-2" : "px-4 py-2.5",
        className,
      )}
      aria-label="AHPRA-registered Australian GPs. Verify on ahpra.gov.au."
    >
      {/* Shield mark with subtle ring */}
      <div className="relative shrink-0">
        <div className={cn(
          "rounded-full bg-primary/8 dark:bg-primary/15",
          "border border-primary/25",
          "flex items-center justify-center",
          compact ? "w-8 h-8" : "w-9 h-9",
        )}>
          <ShieldCheck className={cn("text-primary", compact ? "w-4 h-4" : "w-[18px] h-[18px]")} strokeWidth={2.2} />
        </div>
        <div className="absolute inset-0 rounded-full border border-dashed border-primary/15 m-[2px] pointer-events-none" />
      </div>

      {/* Text block */}
      <div className="leading-tight">
        <p className={cn(
          "font-semibold text-foreground",
          compact ? "text-[11px]" : "text-xs",
        )}>
          AHPRA-registered Australian GPs
        </p>
        <p className={cn(
          "text-muted-foreground flex items-center gap-1",
          compact ? "text-[9px] mt-0.5" : "text-[10px] mt-0.5",
        )}>
          <span>Verifiable at ahpra.gov.au</span>
          <ExternalLink className={cn("opacity-60 group-hover:opacity-100 transition-opacity", compact ? "w-2 h-2" : "w-2.5 h-2.5")} aria-hidden="true" />
        </p>
      </div>
    </a>
  )
}
