import { CheckCircle2, Clock, Mail, PhoneOff } from "lucide-react"

import { cn } from "@/lib/utils"

interface MedCertHeroMockupProps {
  /** Compact mode for mobile - no floating overlays */
  compact?: boolean
}

/**
 * Medical certificate document mockup for the /medical-certificate hero.
 * Looks like the actual certificate the patient receives — not the intake form.
 *
 * CSS animations only — no framer-motion — so the mockup is visible from SSR
 * without the opacity:0 hydration flash that delays LCP.
 */
export function MedCertHeroMockup({ compact = false }: MedCertHeroMockupProps) {
  return (
    <div className={cn("relative", compact ? "w-full" : "w-72 xl:w-80")}>
      {/* Certificate card */}
      <div className={cn(
        "rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none overflow-hidden",
        compact ? "hero-mobile-mockup-enter" : "hero-mockup-enter",
      )}>
        {/* Certificate header bar */}
        <div className="bg-slate-800 dark:bg-slate-900 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center shrink-0">
              <span className="text-[9px] font-black text-white leading-none">+</span>
            </div>
            <span className="text-[11px] font-semibold text-white/90 tracking-wide">InstantMed</span>
          </div>
          <span className="text-[9px] text-white/50 uppercase tracking-[0.12em] font-medium">Medical Certificate</span>
        </div>

        {/* Certificate body */}
        <div className={cn("px-5 py-4 space-y-3.5", compact ? "px-4 py-3 space-y-3" : "")}>
          {/* To whom it may concern */}
          <p className="text-[10px] text-muted-foreground italic">To Whom It May Concern</p>

          {/* Patient */}
          <div>
            <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-0.5">Patient</p>
            <p className="text-sm font-semibold text-foreground">Sarah Mitchell</p>
          </div>

          {/* Date + Duration row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-0.5">Date</p>
              <p className="text-xs font-medium text-foreground">15 April 2026</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-0.5">Absent for</p>
              <p className="text-xs font-medium text-foreground">1 Day (Work)</p>
            </div>
          </div>

          {/* Certification text */}
          <div className="bg-muted/40 dark:bg-white/[0.04] rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              This certifies that the above patient was under my care and was unfit for work on the above date due to illness.
            </p>
          </div>

          {/* Doctor + stamp */}
          <div className="flex items-end justify-between pt-0.5">
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-0.5">Doctor</p>
              <p className="text-xs font-semibold text-foreground">Dr. A. Williams</p>
              <p className="text-[9px] text-muted-foreground font-mono tracking-wide mt-0.5">MED0001234567</p>
            </div>
            {/* Verified stamp */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-11 h-11 rounded-full border-2 border-primary/25 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary/60" />
              </div>
              <span className="text-[8px] font-semibold text-primary/60 uppercase tracking-wider">Verified</span>
            </div>
          </div>
        </div>

        {/* Footer strip */}
        <div className="bg-muted/30 dark:bg-white/[0.03] border-t border-border/30 px-5 py-2 flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground/50">instantmed.com.au</span>
          <span className="text-[9px] text-muted-foreground/50 font-mono">REF: IM-2026-{compact ? "4823" : "48231"}</span>
        </div>
      </div>

      {/* Floating badges — desktop only */}
      {!compact && (
        <>
          <div className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            style={{ animation: "hero-fade-up 0.4s ease-out 0.50s both" }}
          >
            <Clock className="w-3.5 h-3.5 text-primary" />
            Takes ~2 min
          </div>

          <div className="absolute -top-3 -left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            style={{ animation: "hero-fade-up 0.4s ease-out 0.65s both" }}
          >
            <PhoneOff className="w-3.5 h-3.5 text-primary" />
            No appointment
          </div>
        </>
      )}

      {/* Delivery notification overlay — desktop only */}
      {!compact && (
        <div
          className="absolute -bottom-8 -right-4 xl:-right-8 rounded-xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-3 min-w-[210px]"
          style={{ animation: "hero-fade-up 0.5s ease-out 0.60s both" }}
        >
          <div className="space-y-2">
            {[
              { icon: CheckCircle2, iconClass: "text-success", text: "Request submitted", meta: "2m ago", bold: false },
              { icon: CheckCircle2, iconClass: "text-success", text: "Doctor reviewed", meta: "Just now", bold: false },
              { icon: Mail, iconClass: "text-primary", text: "Certificate sent", meta: null, bold: true },
            ].map(({ icon: Icon, iconClass, text, meta, bold }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className={cn("w-3.5 h-3.5 shrink-0", iconClass)} />
                <span className={cn("text-[11px]", bold ? "font-medium text-foreground" : "text-foreground/60")}>
                  {text}
                </span>
                {meta && <span className="text-[9px] text-muted-foreground ml-auto">{meta}</span>}
                {bold && (
                  <span className="inline-flex items-center gap-0.5 ml-auto px-1.5 py-0.5 rounded-full bg-success/10 text-[9px] font-medium text-success animate-pulse">
                    Done
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
