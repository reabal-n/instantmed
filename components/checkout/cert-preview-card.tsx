"use client"

import { CheckCircle2, FileText, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"

interface CertPreviewCardProps {
  /** Patient name as entered in intake. Falls back to dotted placeholder if missing. */
  patientName?: string
  /** Certificate category - work, study, carer */
  certType?: string
  /** Duration in days (1, 2, or 3) */
  durationDays?: string | number
  /** Issue date - defaults to today */
  issueDate?: Date
  className?: string
}

const CERT_TYPE_LABELS: Record<string, string> = {
  work: "Work",
  study: "Study",
  carer: "Carer",
}

function formatAusDate(date: Date): string {
  const dayName = date.toLocaleDateString("en-AU", { weekday: "long" })
  const day = date.getDate()
  const month = date.toLocaleDateString("en-AU", { month: "long" })
  const year = date.getFullYear()
  return `${dayName}, ${day} ${month} ${year}`
}

/**
 * Live preview of the medical certificate the patient will receive.
 *
 * Closes the "is this what I'm paying for?" trust loop right at checkout. Pulls
 * the patient's real name and certificate selections from the intake, but is
 * clearly marked as a PREVIEW so it can never be confused with the actual
 * issued document. The real certificate is generated server-side after a
 * doctor approves the request.
 */
export function CertPreviewCard({
  patientName,
  certType,
  durationDays,
  issueDate = new Date(),
  className,
}: CertPreviewCardProps) {
  const displayName = (patientName?.trim() || "").toUpperCase() || "•  •  •  •  •"
  const certLabel = certType && CERT_TYPE_LABELS[certType] ? CERT_TYPE_LABELS[certType] : "Medical"
  const days = durationDays ? Number(durationDays) : 1
  const dayLabel = `${days} day${days === 1 ? "" : "s"}`
  const dateStr = formatAusDate(issueDate)

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview header strip */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preview of your certificate
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Issued after doctor review
        </span>
      </div>

      {/* Paper card */}
      <div
        className={cn(
          "relative rounded-[12px] overflow-hidden",
          "bg-[#fbfaf6] dark:bg-[#1a2030]",
          "border border-[#e9e4d6] dark:border-white/10",
          "shadow-md shadow-primary/[0.08]",
        )}
      >
        {/* Paper grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(245, 198, 160, 0.04) 0%, transparent 60%), radial-gradient(ellipse 70% 60% at 80% 90%, rgba(186, 212, 245, 0.03) 0%, transparent 60%)",
          }}
          aria-hidden="true"
        />

        {/* Letterhead */}
        <div className="relative px-5 pt-4 pb-3 border-b border-[#e9e4d6] dark:border-white/10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-white leading-none translate-y-[-1px]">+</span>
            </div>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold tracking-tight text-foreground dark:text-white">InstantMed</p>
              <p className="text-[9px] text-muted-foreground/80 dark:text-white/50 tracking-wide">ABN 64 694 559 334</p>
            </div>
          </div>
          <div className="text-right leading-tight">
            <p className="text-[9px] text-muted-foreground/70 dark:text-white/40">Surry Hills NSW 2010</p>
          </div>
        </div>

        {/* Body */}
        <div className="relative px-5 py-4 space-y-3.5">
          {/* Title */}
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80">
              Medical Certificate
            </p>
            <div className="mt-1.5 h-px bg-gradient-to-r from-transparent via-[#d8d2c0] dark:via-white/15 to-transparent" />
          </div>

          {/* Date row */}
          <div className="flex items-baseline justify-between text-[10px]">
            <span className="text-muted-foreground/70 dark:text-white/45 uppercase tracking-wider font-semibold">Date issued</span>
            <span className="font-medium text-foreground dark:text-white/90">{formatAusDate(issueDate)}</span>
          </div>

          {/* Certifying clause + patient */}
          <div className="space-y-2">
            <p className="text-[11px] text-foreground/80 dark:text-white/70 italic leading-relaxed">
              This is to certify that
            </p>
            <p className={cn(
              "text-[15px] font-semibold tracking-[0.04em] text-foreground dark:text-white text-center py-1.5",
              "border-y border-dashed border-[#d8d2c0] dark:border-white/15",
              !patientName?.trim() && "text-muted-foreground/60 font-normal tracking-wider",
            )}>
              {displayName}
            </p>
            <p className="text-[11px] text-foreground/80 dark:text-white/70 leading-relaxed">
              was unfit for {certLabel.toLowerCase() === "carer" ? "carer responsibilities" : certLabel.toLowerCase() === "study" ? "study" : "work"} on the date below due to a medical condition.
            </p>
          </div>

          {/* Period of incapacity */}
          <div className="bg-[#f4eedf]/60 dark:bg-white/[0.04] rounded-md px-3 py-2.5 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/70 dark:text-white/45">Absent</span>
            <span className="text-[11px] font-medium text-foreground dark:text-white/90">{dateStr} ({dayLabel})</span>
          </div>

          {/* Issuer placeholder + AHPRA seal */}
          <div className="flex items-end justify-between gap-3 pt-1">
            <div className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/70 dark:text-white/45">Issued by</p>
              <p className="text-[10px] text-muted-foreground italic">
                Reviewing GP signs at approval
              </p>
              <p className="text-[9px] text-muted-foreground/70 dark:text-white/40">
                AHPRA-registered Australian GP
              </p>
            </div>

            {/* AHPRA verification placeholder */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="relative w-10 h-10 rounded-full bg-primary/8 dark:bg-primary/15 border border-primary/30 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={2} />
                <div className="absolute inset-0 rounded-full border border-dashed border-primary/20 m-[3px]" />
              </div>
              <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-primary/80">AHPRA</p>
            </div>
          </div>
        </div>

        {/* Footer strip */}
        <div className="relative bg-[#f4eedf]/40 dark:bg-white/[0.025] border-t border-[#e9e4d6] dark:border-white/10 px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-success" aria-hidden="true" />
            <span className="text-[9px] text-muted-foreground/80 dark:text-white/50">Fair Work Act s 107</span>
          </div>
          <span className="text-[9px] text-muted-foreground/70 dark:text-white/40 font-mono">REF pending</span>
        </div>

        {/* PREVIEW watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-3 text-[7px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/35 dark:text-white/30 rotate-[8deg] select-none"
        >
          Preview
        </div>
      </div>

      {/* Honest disclaimer below the preview */}
      <p className="text-[10px] text-muted-foreground text-center px-2 leading-relaxed">
        Final certificate is signed by your reviewing doctor and emailed to you as a PDF after approval.
      </p>
    </div>
  )
}
