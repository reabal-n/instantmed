"use client"

import { CheckCircle2, Clock, Download, FileText, Mail } from "lucide-react"
import Image from "next/image"

/** Step 1: Patient filling in the intake form */
export function StepOneMockup() {
  return (
    <div className="p-4 space-y-3">
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-1">
          What&apos;s going on?
        </p>
        <div className="h-8 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/50 px-2.5 flex items-center">
          <span className="text-xs text-foreground/70">
            Cold and flu symptoms
          </span>
          <span className="ml-0.5 w-px h-3.5 bg-primary animate-[blink_1s_ease-in-out_infinite]" />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-1">
          How long?
        </p>
        <div className="h-8 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/50 px-2.5 flex items-center">
          <span className="text-xs text-foreground/70">Since yesterday</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="w-3 h-3 text-primary" />
        ~2 min
      </div>
    </div>
  )
}

/** Step 2: Doctor reviewing the request */
export function StepTwoMockup() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Image
          src="https://api.dicebear.com/7.x/notionists/svg?seed=DrReview"
          alt=""
          width={28}
          height={28}
          className="w-7 h-7 rounded-full bg-muted/30"
          unoptimized
          loading="lazy"
        />
        <div>
          <p className="text-[10px] font-semibold text-foreground leading-tight">
            Your GP
          </p>
          <p className="text-[8px] text-emerald-500">Reviewing</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {["Identity verified", "Clinical assessment", "Certificate approved"].map(
          (item) => (
            <div key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] text-foreground">{item}</span>
            </div>
          )
        )}
      </div>
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-light text-[10px] font-medium text-success">
        <CheckCircle2 className="w-3 h-3" />
        Approved
      </div>
    </div>
  )
}

/** Step 3: Certificate delivered via email */
export function StepThreeMockup() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Mail className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-foreground leading-tight">
            Your medical certificate is ready
          </p>
          <p className="text-[8px] text-muted-foreground">
            InstantMed &middot; Just now
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 dark:bg-muted/10 border border-border/30">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-foreground truncate">
            MedCert_2026.pdf
          </p>
          <p className="text-[8px] text-muted-foreground">42 KB</p>
        </div>
      </div>
      <div className="h-7 rounded-lg bg-primary flex items-center justify-center gap-1 shadow-sm shadow-primary/25">
        <Download className="w-3 h-3 text-white" />
        <span className="text-[10px] font-semibold text-white">Download</span>
      </div>
    </div>
  )
}
