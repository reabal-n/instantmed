import { CheckCircle2, MapPin, Smartphone } from "lucide-react"

import { cn } from "@/lib/utils"

interface EScriptHeroMockupProps {
  /** Compact mode for mobile - shows card only, no floating badges or timeline */
  compact?: boolean
}

/** Minimal SVG QR code — visually convincing, not scannable */
function QRCode({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
      aria-hidden="true"
    >
      {/* Top-left finder */}
      <rect x="0" y="0" width="7" height="7" fill="currentColor" />
      <rect x="1" y="1" width="5" height="5" fill="white" />
      <rect x="2" y="2" width="3" height="3" fill="currentColor" />
      {/* Top-right finder */}
      <rect x="14" y="0" width="7" height="7" fill="currentColor" />
      <rect x="15" y="1" width="5" height="5" fill="white" />
      <rect x="16" y="2" width="3" height="3" fill="currentColor" />
      {/* Bottom-left finder */}
      <rect x="0" y="14" width="7" height="7" fill="currentColor" />
      <rect x="1" y="15" width="5" height="5" fill="white" />
      <rect x="2" y="16" width="3" height="3" fill="currentColor" />
      {/* Timing patterns */}
      <rect x="8" y="6" width="1" height="1" fill="currentColor" />
      <rect x="10" y="6" width="1" height="1" fill="currentColor" />
      <rect x="12" y="6" width="1" height="1" fill="currentColor" />
      <rect x="6" y="8" width="1" height="1" fill="currentColor" />
      <rect x="6" y="10" width="1" height="1" fill="currentColor" />
      <rect x="6" y="12" width="1" height="1" fill="currentColor" />
      {/* Data modules */}
      <rect x="8" y="8" width="2" height="2" fill="currentColor" />
      <rect x="11" y="8" width="1" height="1" fill="currentColor" />
      <rect x="13" y="8" width="2" height="2" fill="currentColor" />
      <rect x="8" y="11" width="1" height="2" fill="currentColor" />
      <rect x="10" y="11" width="2" height="1" fill="currentColor" />
      <rect x="13" y="11" width="1" height="1" fill="currentColor" />
      <rect x="8" y="14" width="1" height="1" fill="currentColor" />
      <rect x="10" y="14" width="1" height="1" fill="currentColor" />
      <rect x="12" y="14" width="1" height="1" fill="currentColor" />
      <rect x="8" y="16" width="2" height="1" fill="currentColor" />
      <rect x="11" y="16" width="1" height="1" fill="currentColor" />
      <rect x="13" y="15" width="2" height="2" fill="currentColor" />
      <rect x="14" y="8" width="1" height="1" fill="currentColor" />
      <rect x="16" y="8" width="1" height="1" fill="currentColor" />
      <rect x="18" y="8" width="1" height="1" fill="currentColor" />
      <rect x="15" y="10" width="2" height="1" fill="currentColor" />
      <rect x="18" y="10" width="1" height="2" fill="currentColor" />
      <rect x="14" y="12" width="1" height="1" fill="currentColor" />
      <rect x="16" y="12" width="2" height="1" fill="currentColor" />
      <rect x="14" y="14" width="2" height="2" fill="currentColor" />
      <rect x="17" y="14" width="1" height="1" fill="currentColor" />
      <rect x="19" y="15" width="2" height="2" fill="currentColor" />
      <rect x="17" y="17" width="3" height="1" fill="currentColor" />
      <rect x="14" y="17" width="2" height="1" fill="currentColor" />
      <rect x="8" y="18" width="1" height="1" fill="currentColor" />
      <rect x="10" y="19" width="2" height="1" fill="currentColor" />
      <rect x="8" y="20" width="1" height="1" fill="currentColor" />
      <rect x="11" y="20" width="1" height="1" fill="currentColor" />
    </svg>
  )
}

/**
 * eScript-specific hero mockup for the prescriptions landing page.
 * Shows the eScript token card: QR code + prescription details + delivery timeline.
 * CSS animations only — no framer-motion — so the mockup is visible from SSR.
 */
export function EScriptHeroMockup({ compact = false }: EScriptHeroMockupProps) {
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
          <span className="text-sm font-semibold text-foreground">eScript Ready</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
            Active
          </span>
        </div>

        <p className="text-[11px] text-foreground/60 leading-relaxed mb-3">
          Your electronic prescription is ready. Show this at any pharmacy to collect your medication.
        </p>

        {/* QR code + token info */}
        <div className="flex items-start gap-3 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/40 p-3 mb-3">
          {/* QR code */}
          <div className="shrink-0 w-[62px] h-[62px] rounded-lg bg-white border border-border/60 p-1.5 shadow-sm">
            <QRCode className="text-foreground" />
          </div>

          {/* Token details */}
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5 font-medium">
              Prescription Token
            </p>
            <p className="text-[12px] font-mono font-semibold text-primary tracking-wider mb-1.5">
              ABCD-1234-EFGH
            </p>
            <p className="text-[10px] font-medium text-foreground/80">Atorvastatin 40mg</p>
            <p className="text-[10px] text-muted-foreground">Qty: 30 &middot; Repeats: 5</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-muted-foreground text-center">
          Show to any pharmacist to collect
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
