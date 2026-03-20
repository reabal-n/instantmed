"use client"

import { Mail } from "lucide-react"

export function CertificateMockup() {
  return (
    <div className="relative px-4 pt-4 pb-2">
      <div className="rounded-xl bg-white dark:bg-card border border-border/40 shadow-sm p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">iM</div>
            <span className="text-[10px] font-semibold text-foreground">Medical Certificate</span>
          </div>
          <span className="text-[8px] text-muted-foreground font-mono">IM-CERT-2026</span>
        </div>

        {/* Content lines */}
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-muted/60 dark:bg-muted/30 w-full" />
          <div className="h-2 rounded-full bg-muted/60 dark:bg-muted/30 w-4/5" />
          <div className="h-2 rounded-full bg-muted/60 dark:bg-muted/30 w-3/5" />
          <div className="h-2 rounded-full bg-muted/40 dark:bg-muted/20 w-full" />
          <div className="h-2 rounded-full bg-muted/40 dark:bg-muted/20 w-2/3" />
        </div>

        {/* Signature area */}
        <div className="flex items-end justify-between pt-2 border-t border-border/30">
          <div className="space-y-1">
            <div className="w-16 h-px bg-foreground/30" />
            <span className="text-[9px] text-muted-foreground">Dr. S. Thompson</span>
          </div>
          {/* Seal */}
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border border-primary/30 flex items-center justify-center text-[6px] font-bold text-primary/50">
              GP
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-1 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-card border border-border/40 shadow-md text-[9px] font-medium text-muted-foreground">
        <Mail className="w-3 h-3 text-primary" />
        Delivered to your inbox
      </div>
    </div>
  )
}
