import { Stethoscope } from "@/lib/icons"

export function ConsultMockup() {
  return (
    <div className="relative px-4 pt-4 pb-2">
      <div className="rounded-xl bg-white dark:bg-card border border-border/40 shadow-sm overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
          <div className="relative">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-semibold text-primary">GP</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-card" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-foreground leading-tight">Your GP</p>
            <p className="text-[8px] text-emerald-500">Online</p>
          </div>
        </div>

        {/* Chat messages */}
        <div className="p-3 space-y-2">
          {/* Doctor message */}
          <div className="bg-muted/50 dark:bg-muted/20 rounded-xl rounded-tl-sm p-2.5 max-w-[85%]">
            <p className="text-[9px] text-foreground leading-relaxed">
              Based on what you&apos;ve described, I&apos;d recommend...
            </p>
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-7 rounded-lg bg-muted/30 dark:bg-muted/10 border border-border/40 px-2 flex items-center">
              <span className="text-[9px] text-muted-foreground">Type your message...</span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute bottom-1 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-card border border-border/40 shadow-md text-[9px] font-medium text-muted-foreground">
        <Stethoscope className="w-3 h-3 text-primary" />
        GP reviewed
      </div>
    </div>
  )
}
