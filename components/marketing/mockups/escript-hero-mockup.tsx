import { CheckCircle2, MapPin, Pill, Smartphone } from "lucide-react"

import { cn } from "@/lib/utils"

interface EScriptHeroMockupProps {
  /** Compact mode for mobile - shows card only, no floating badges or timeline */
  compact?: boolean
}

/**
 * eScript-specific hero mockup for the prescriptions landing page.
 * Shows the eScript delivery flow: request → doctor review → SMS sent.
 * CSS animations only — no framer-motion — so the mockup is visible from SSR
 * without the opacity:0 hydration flash that delays LCP.
 */
export function EScriptHeroMockup({ compact = false }: EScriptHeroMockupProps) {
  return (
    <div className={cn("relative", compact ? "w-full" : "w-72 xl:w-80")}>
      {/* Main card */}
      <div
        className={cn(
          "rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none space-y-4",
          compact ? "p-4" : "p-5",
          compact ? "hero-mobile-mockup-enter" : "hero-mockup-enter",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Pill className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">eScript Ready</span>
        </div>

        {/* SMS notification area */}
        <div className="rounded-xl bg-muted/50 dark:bg-muted/20 border border-border/50 p-3.5 space-y-2">
          <p className="text-[12px] leading-relaxed text-foreground/70">
            Your eScript is ready. Show this at any pharmacy to collect your medication.
          </p>
          <p className="text-[11px] font-medium text-primary">
            escript.health/tk-2847-x
          </p>
        </div>

        {/* Pharmacy instruction */}
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground">Works at any pharmacy in Australia</span>
        </div>
      </div>

      {/* Floating badges — desktop only */}
      {!compact && (
        <>
          <div
            className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            style={{ animation: "hero-fade-up 0.4s ease-out 0.50s both" }}
          >
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            Sent via SMS
          </div>

          <div
            className="absolute -top-3 -left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            style={{ animation: "hero-fade-up 0.4s ease-out 0.65s both" }}
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
            Any pharmacy
          </div>
        </>
      )}

      {/* Progress timeline — desktop only */}
      {!compact && (
        <div
          className="absolute -bottom-8 -right-4 xl:-right-8 rounded-xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-3 min-w-[210px]"
          style={{ animation: "hero-fade-up 0.5s ease-out 0.6s both" }}
        >
          <div className="space-y-2">
            <div
              className="flex items-center gap-2"
              style={{ animation: "hero-fade-up 0.3s ease-out 0.9s both" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span className="text-[11px] text-foreground/60">Request submitted</span>
              <span className="text-[9px] text-muted-foreground ml-auto">5m ago</span>
            </div>
            <div
              className="flex items-center gap-2"
              style={{ animation: "hero-fade-up 0.3s ease-out 1.1s both" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span className="text-[11px] text-foreground/60">Doctor reviewed</span>
              <span className="text-[9px] text-muted-foreground ml-auto">Just now</span>
            </div>
            <div
              className="flex items-center gap-2"
              style={{ animation: "hero-fade-up 0.3s ease-out 1.3s both" }}
            >
              <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-medium text-foreground">eScript sent</span>
              <span className="inline-flex items-center gap-0.5 ml-auto px-1.5 py-0.5 rounded-full bg-success/10 text-[9px] font-medium text-success">
                Done
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
