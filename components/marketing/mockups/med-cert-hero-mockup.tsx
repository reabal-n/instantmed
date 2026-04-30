import { CheckCircle2, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"

interface MedCertHeroMockupProps {
  /** Compact mode for mobile - no floating overlays, condensed body */
  compact?: boolean
}

/**
 * Document-realism medical certificate mockup for the /medical-certificate hero.
 *
 * Goal: looks like the actual PDF a patient receives, not a SaaS UI widget.
 * - Warm paper background, not pure white
 * - Letterhead with practice ABN + address (real legal data)
 * - "MEDICAL CERTIFICATE" title in formal document type
 * - Generic patient (JOHN SMITH) so the same mockup ships to every visitor
 * - No fake doctor name. Issuer block is "AHPRA-registered Medical Practitioner"
 *   with an AHPRA verification seal in the corner.
 * - Subtle SPECIMEN watermark so a screenshot can never be passed off as real.
 *
 * CSS animations only, no framer-motion, so the mockup is in the SSR HTML
 * without an opacity:0 hydration flash that would delay LCP.
 */
export function MedCertHeroMockup({ compact = false }: MedCertHeroMockupProps) {
  return (
    <div className={cn("relative", compact ? "w-full" : "w-[22rem] xl:w-[24rem]")}>
      {/* Paper card */}
      <div
        className={cn(
          "relative rounded-[14px] overflow-hidden",
          "bg-[#fbfaf6] dark:bg-[#1a2030]",
          "border border-[#e9e4d6] dark:border-white/10",
          "shadow-xl shadow-primary/[0.08] dark:shadow-black/40",
          compact ? "hero-mobile-mockup-enter" : "hero-mockup-enter",
        )}
      >
        {/* Paper grain - very subtle warm gradient that hints at fibre */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(245, 198, 160, 0.04) 0%, transparent 60%), radial-gradient(ellipse 70% 60% at 80% 90%, rgba(186, 212, 245, 0.03) 0%, transparent 60%)",
          }}
          aria-hidden="true"
        />

        {/* Letterhead */}
        <div className={cn("relative px-6 pt-5 pb-4 border-b border-[#e9e4d6] dark:border-white/10", compact && "px-5 pt-4 pb-3")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
                <span className="text-sm font-black text-white leading-none translate-y-[-1px]">+</span>
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold tracking-tight text-foreground dark:text-white">InstantMed</p>
                <p className="text-[9px] text-muted-foreground dark:text-white/70 tracking-wide">ABN 64 694 559 334</p>
              </div>
            </div>
            <div className="text-right leading-tight">
              <p className="text-[9px] text-muted-foreground/70 dark:text-white/40">Level 1, 457 Elizabeth St</p>
              <p className="text-[9px] text-muted-foreground/70 dark:text-white/40">Surry Hills NSW 2010</p>
            </div>
          </div>
        </div>

        {/* Document body */}
        <div className={cn("relative px-6 py-5 space-y-4", compact && "px-5 py-4 space-y-3")}>
          {/* Title */}
          <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
              Medical Certificate
            </p>
            <div className="mt-1.5 h-px bg-gradient-to-r from-transparent via-[#d8d2c0] dark:via-white/15 to-transparent" />
          </div>

          {/* Date row */}
          <div className="flex items-baseline justify-between text-[10px]">
            <span className="text-muted-foreground/70 dark:text-white/45 uppercase tracking-wider font-semibold">Date issued</span>
            <span className="font-medium text-foreground dark:text-white/90">27 April 2026</span>
          </div>

          {/* Certifying clause + patient */}
          <div className="space-y-2">
            <p className="text-[11px] text-foreground/80 dark:text-white/70 italic leading-relaxed">
              This is to certify that
            </p>
            <p className={cn(
              "text-base font-semibold tracking-[0.04em] text-foreground dark:text-white text-center py-2",
              "border-y border-dashed border-[#d8d2c0] dark:border-white/15",
              compact && "text-[15px] py-1.5",
            )}>
              JOHN SMITH
            </p>
            <p className="text-[11px] text-foreground/80 dark:text-white/70 leading-relaxed">
              was unfit for work on the date below due to a medical condition.
            </p>
          </div>

          {/* Period of incapacity */}
          <div className="bg-[#f4eedf]/60 dark:bg-white/[0.04] rounded-md px-3 py-2.5 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/70 dark:text-white/45">Absent</span>
            <span className="text-[11px] font-medium text-foreground dark:text-white/90">Friday, 27 April 2026 (1 day)</span>
          </div>

          {/* Issuer + AHPRA seal */}
          <div className="flex items-end justify-between gap-3 pt-1">
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/70 dark:text-white/45">Issued by</p>
              {/* Signature line - stylised mark to suggest handwriting without naming a doctor */}
              <svg
                width="80"
                height="18"
                viewBox="0 0 80 18"
                fill="none"
                aria-hidden="true"
                className="text-foreground/70 dark:text-white/60"
              >
                <path
                  d="M2 12 C 8 4, 14 16, 22 8 S 36 14, 44 6 C 50 12, 60 4, 72 10"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <p className="text-[10px] text-foreground/80 dark:text-white/70 font-medium">
                AHPRA-registered GP
              </p>
              <p className="text-[9px] text-muted-foreground/70 dark:text-white/40 font-mono tracking-wide">
                Registration on file
              </p>
            </div>

            {/* AHPRA verification seal */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="relative w-12 h-12 rounded-full bg-primary/8 dark:bg-primary/15 border border-primary/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={2} />
                <div className="absolute inset-0 rounded-full border border-dashed border-primary/20 m-[3px]" />
              </div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-primary">AHPRA</p>
            </div>
          </div>
        </div>

        {/* Footer strip */}
        <div className={cn(
          "relative bg-[#f4eedf]/40 dark:bg-white/[0.025] border-t border-[#e9e4d6] dark:border-white/10",
          "px-6 py-2 flex items-center justify-between",
          compact && "px-5",
        )}>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-success" aria-hidden="true" />
            <span className="text-[9px] text-muted-foreground dark:text-white/70">Fair Work Act s 107</span>
          </div>
          <span className="text-[9px] text-muted-foreground/70 dark:text-white/40 font-mono">REF IM-2026-{compact ? "4823" : "48231"}</span>
        </div>

        {/* SPECIMEN watermark - corner ribbon, very subtle */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-3 text-[7px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/35 dark:text-white/30 rotate-[8deg] select-none"
        >
          Specimen
        </div>
      </div>

      {/* Delivery confirmation - desktop only, redesigned to feel less like SaaS template */}
      {!compact && (
        <div
          className={cn(
            "absolute -bottom-6 -right-3 xl:-right-5",
            "rounded-xl bg-white dark:bg-card",
            "border border-border/50 dark:border-white/10",
            "shadow-lg shadow-primary/[0.08] dark:shadow-none",
            "px-3.5 py-2.5 min-w-[200px]",
          )}
          style={{ animation: "hero-fade-up 0.5s ease-out 0.55s both" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-50" style={{ animation: "ping 2.5s ease-in-out infinite" }} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold text-foreground">Delivered to inbox</p>
              <p className="text-[10px] text-muted-foreground">PDF attachment, 1 page</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
