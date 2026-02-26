import { AlertTriangle, Phone, Heart } from "lucide-react"
import { cn } from "@/lib/utils"

// =============================================================================
// SAFETY COPY - Single source of truth for emergency/safety messaging
// =============================================================================
export const SAFETY_COPY = {
  // Hero-level safety notice (near CTAs)
  hero: {
    text: "This service is for non-urgent care only.",
    link: "If this is an emergency, call 000.",
  },
  // Inline notice for service pages
  inline: {
    title: "Not for emergencies",
    body: "If you have chest pain, difficulty breathing, or any life-threatening symptoms, call 000 or go to your nearest emergency department.",
  },
  // Full disclaimer (footer placement)
  full: {
    title: "Important safety information",
    body: "This is a telehealth service for non-urgent conditions. If you're experiencing a medical emergency, please call 000 immediately.",
    refundNote: "If we can't help with your request, you'll receive a full refund.",
  },
  // Compact one-liner
  compact: {
    text: "Not for emergencies — call 000 for urgent help.",
  },
  // Emergency resources
  resources: {
    emergency: { label: "Emergency", number: "000" },
    lifeline: { label: "Lifeline", number: "13 11 14" },
    healthdirect: { label: "Healthdirect", number: "1800 022 222" },
  },
} as const

// =============================================================================
// TYPES
// =============================================================================
interface EmergencyDisclaimerProps {
  className?: string
  variant?: "default" | "compact" | "hero" | "inline"
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * EmergencyDisclaimer - Required compliance component for service pages
 * 
 * Variants:
 * - hero: Minimal, calm notice placed near primary CTAs
 * - inline: Mid-page notice with clear guidance
 * - compact: Single-line footer notice
 * - default: Full safety information block
 */
export function EmergencyDisclaimer({ 
  className,
  variant = "default" 
}: EmergencyDisclaimerProps) {
  
  // Hero variant - minimal, near CTAs
  if (variant === "hero") {
    return (
      <div className={cn(
        "flex items-center justify-center gap-2 text-sm text-muted-foreground",
        className
      )}>
        <span>{SAFETY_COPY.hero.text}</span>
        <a 
          href="tel:000" 
          className="inline-flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium"
        >
          <Phone className="h-3.5 w-3.5" />
          {SAFETY_COPY.hero.link}
        </a>
      </div>
    )
  }

  // Compact variant - single line
  if (variant === "compact") {
    return (
      <div className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className
      )}>
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
        <span>{SAFETY_COPY.compact.text}</span>
      </div>
    )
  }

  // Inline variant - clear mid-page notice
  if (variant === "inline") {
    return (
      <div className={cn(
        "rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4",
        className
      )}>
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0">
            <Phone className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-1">
              {SAFETY_COPY.inline.title}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {SAFETY_COPY.inline.body}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Default variant - full safety block
  return (
    <div className={cn(
      "rounded-xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-5",
      className
    )}>
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0">
          <Heart className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {SAFETY_COPY.full.title}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {SAFETY_COPY.full.body}
            </p>
          </div>
          
          {/* Emergency resources */}
          <div className="flex flex-wrap gap-2">
            <a
              href="tel:000"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            >
              <Phone className="h-3 w-3" />
              000 — Emergency
            </a>
            <a
              href="tel:131114"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
            >
              <Heart className="h-3 w-3" />
              Lifeline — 13 11 14
            </a>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {SAFETY_COPY.full.refundNote}
          </p>
        </div>
      </div>
    </div>
  )
}
