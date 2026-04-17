import { CheckCircle2, Clock, Smartphone, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"

interface HairLossHeroMockupProps {
  compact?: boolean
}

const TIMELINE = [
  {
    month: "Month 1",
    label: "Treatment starts",
    description: "eScript sent to your phone",
    done: true,
    active: false,
  },
  {
    month: "Month 3",
    label: "Reduced shedding",
    description: "Most patients notice less loss",
    done: true,
    active: false,
  },
  {
    month: "Month 6",
    label: "Visible regrowth",
    description: "Evidence-based results",
    done: false,
    active: true,
  },
]

/**
 * Hair loss hero mockup — treatment progress timeline card.
 * CSS animations only — no framer-motion — SSR-safe.
 */
export function HairLossHeroMockup({ compact = false }: HairLossHeroMockupProps) {
  return (
    <div className={cn("relative", compact ? "w-full" : "w-72 xl:w-80")}>
      {/* Main card */}
      <div
        className={cn(
          "rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none",
          compact ? "p-4" : "p-5",
          compact ? "hero-mobile-mockup-enter" : "hero-mockup-enter",
        )}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-foreground">InstantMed</span>
          <span className="text-[10px] text-muted-foreground">2:34 PM</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground">Treatment Plan</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
            Active
          </span>
        </div>

        <p className="text-[11px] text-foreground/60 leading-relaxed mb-4">
          Your personalised hair loss treatment has been approved by an AHPRA-registered doctor.
        </p>

        {/* Progress timeline */}
        <div className="space-y-0 mb-3">
          {TIMELINE.map((step, i) => (
            <div key={step.month} className="flex gap-3">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                    step.done
                      ? "bg-success border-success"
                      : step.active
                        ? "bg-primary border-primary"
                        : "bg-muted border-border",
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  ) : step.active ? (
                    <TrendingUp className="w-2.5 h-2.5 text-white" />
                  ) : (
                    <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                  )}
                </div>
                {i < TIMELINE.length - 1 && (
                  <div className={cn("w-px flex-1 my-0.5", step.done ? "bg-success/40" : "bg-border/60")} />
                )}
              </div>

              {/* Step content */}
              <div className={cn("pb-3", i === TIMELINE.length - 1 && "pb-0")}>
                <p className="text-[9px] uppercase tracking-widest font-medium text-muted-foreground mb-0.5">
                  {step.month}
                </p>
                <p className={cn("text-[11px] font-semibold", step.active ? "text-primary" : "text-foreground/80")}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground text-center border-t border-border/40 pt-2.5">
          Discreet packaging &middot; Shipped to your door
        </p>
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
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            Evidence-based
          </div>
        </>
      )}

      {/* Doctor reviewed badge — desktop only */}
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
              <span className="text-[11px] text-foreground/60">Assessment submitted</span>
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
