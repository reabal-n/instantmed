import { Mail } from "lucide-react"

export function CertificateMockup() {
  return (
    <div className="relative px-4 pt-4 pb-2">
      <div className="rounded-xl bg-white dark:bg-card border border-border/40 shadow-sm p-4 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[8px] font-semibold text-primary">iM</div>
            <span className="text-[10px] font-semibold text-foreground">Medical Certificate</span>
          </div>
          <span className="text-[8px] text-muted-foreground font-mono">IM-CERT-2026</span>
        </div>

        {/* Patient info */}
        <div className="space-y-1.5 pt-1 border-t border-border/20">
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-muted-foreground w-10 shrink-0">Patient</span>
            <div className="h-2 rounded-full bg-muted/50 dark:bg-muted/25 flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-muted-foreground w-10 shrink-0">DOB</span>
            <div className="h-2 rounded-full bg-muted/50 dark:bg-muted/25 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-muted-foreground w-10 shrink-0">Date</span>
            <span className="text-[8px] text-foreground/60">20 Mar 2026</span>
          </div>
        </div>

        {/* Certificate body */}
        <div className="space-y-1.5 pt-1 border-t border-border/20">
          <p className="text-[8px] text-foreground/70 leading-relaxed">
            This is to certify that the above patient was assessed and is unfit for work/study for the period of:
          </p>
          <div className="flex items-center gap-2 bg-primary/5 dark:bg-primary/10 rounded-md px-2 py-1">
            <span className="text-[8px] font-semibold text-primary">1 day</span>
            <span className="text-[8px] text-muted-foreground">· 20 Mar 2026</span>
          </div>
        </div>

        {/* Signature area */}
        <div className="flex items-end justify-between pt-1.5 border-t border-border/20">
          <div className="space-y-0.5">
            <div className="w-14 h-[3px] rounded bg-foreground/15 mb-0.5" />
            <span className="text-[8px] font-medium text-foreground/70">Your GP</span>
            <span className="text-[7px] text-muted-foreground block">AHPRA: MED0001234567</span>
          </div>
          {/* Seal */}
          <div className="w-9 h-9 rounded-full border-2 border-primary/20 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border border-primary/30 flex items-center justify-center text-[6px] font-semibold text-primary/50">
              GP
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute bottom-1 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-card border border-border/40 shadow-md text-[9px] font-medium text-muted-foreground">
        <Mail className="w-3 h-3 text-primary" />
        Delivered to your inbox
      </div>
    </div>
  )
}
