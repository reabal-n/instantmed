import { MessageSquareText, Pill } from "lucide-react"

import { cn } from "@/lib/utils"

/** Fictional delivery example; no usable token, drug, quantity or repeat claim. */
export function EScriptHeroMockup({ compact = false }: { compact?: boolean }) {
  return (
    <figure data-hero-facsimile="" aria-label="Example eScript delivery message" className="mx-auto w-full max-w-sm">
      <div className={cn("rounded-2xl border border-border/60 bg-white shadow-xl shadow-primary/[0.08] dark:bg-card dark:shadow-none", compact ? "p-5" : "p-6 sm:p-8")}>
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-5">
          <span className="text-lg font-semibold tracking-tight text-primary">InstantMed<span className="text-brand-coral">.</span></span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Example</span>
        </div>
        <div className="py-8">
          <MessageSquareText className="h-7 w-7 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-4 text-xl font-semibold tracking-tight">Your eScript is ready</p>
          <div className="mt-5 rounded-xl bg-muted/50 p-4 text-base leading-7 text-foreground/85">
            Hi Alex, your electronic prescription is ready. Open the secure link in your message to access your token.
            <span className="mt-3 block text-sm text-primary">Secure prescription link</span>
          </div>
          <div className="mt-6 flex items-start gap-3">
            <Pill className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm leading-6 text-muted-foreground">Take your token to an Australian pharmacy to collect your medication.</p>
          </div>
        </div>
        <p className="border-t border-border/60 pt-4 text-sm leading-6 text-muted-foreground">Sent by SMS if the doctor prescribes. Medication costs are separate.</p>
      </div>
    </figure>
  )
}
