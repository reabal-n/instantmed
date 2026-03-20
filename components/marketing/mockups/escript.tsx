"use client"

import { Pill } from "lucide-react"

export function EScriptMockup() {
  return (
    <div className="relative px-4 pt-4 pb-2">
      {/* Phone container */}
      <div className="mx-auto w-40 rounded-2xl bg-foreground/5 dark:bg-white/[0.06] border border-border/40 p-2 space-y-2">
        {/* Status bar */}
        <div className="flex justify-between items-center px-1">
          <span className="text-[8px] text-muted-foreground">9:41</span>
          <div className="w-8 h-1 rounded-full bg-foreground/20" />
          <div className="flex gap-0.5">
            <div className="w-2 h-1.5 rounded-sm bg-foreground/20" />
            <div className="w-2 h-1.5 rounded-sm bg-foreground/20" />
          </div>
        </div>

        {/* SMS bubble */}
        <div className="bg-primary/10 dark:bg-primary/20 rounded-xl rounded-tl-sm p-2.5">
          <p className="text-[9px] text-foreground leading-relaxed">
            Your eScript is ready. Show this at any pharmacy.
          </p>
        </div>

        {/* Token */}
        <div className="bg-white dark:bg-card rounded-lg border border-border/40 p-2 text-center">
          <span className="text-[8px] text-muted-foreground block mb-0.5">TOKEN</span>
          <span className="text-xs font-mono font-semibold text-primary tracking-wider">4R7X-9K2M</span>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-1 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-card border border-border/40 shadow-md text-[9px] font-medium text-muted-foreground">
        <Pill className="w-3 h-3 text-emerald-500" />
        Works with any chemist
      </div>
    </div>
  )
}
