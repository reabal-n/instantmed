import React from "react"
import { Pill } from "lucide-react"

const QRCode = React.memo(function QRCode() {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14" fill="currentColor">
      {/* Top-left position pattern */}
      <rect x="0" y="0" width="20" height="20" className="text-foreground/80 dark:text-foreground/70" />
      <rect x="2" y="2" width="16" height="16" className="text-white dark:text-card" />
      <rect x="4" y="4" width="12" height="12" className="text-foreground/80 dark:text-foreground/70" />
      <rect x="6" y="6" width="8" height="8" className="text-white dark:text-card" />
      <rect x="8" y="8" width="4" height="4" className="text-foreground/80 dark:text-foreground/70" />

      {/* Top-right position pattern */}
      <rect x="44" y="0" width="20" height="20" className="text-foreground/80 dark:text-foreground/70" />
      <rect x="46" y="2" width="16" height="16" className="text-white dark:text-card" />
      <rect x="48" y="4" width="12" height="12" className="text-foreground/80 dark:text-foreground/70" />
      <rect x="50" y="6" width="8" height="8" className="text-white dark:text-card" />
      <rect x="52" y="8" width="4" height="4" className="text-foreground/80 dark:text-foreground/70" />

      {/* Bottom-left position pattern */}
      <rect x="0" y="44" width="20" height="20" className="text-foreground/80 dark:text-foreground/70" />
      <rect x="2" y="46" width="16" height="16" className="text-white dark:text-card" />
      <rect x="4" y="48" width="12" height="12" className="text-foreground/80 dark:text-foreground/70" />
      <rect x="6" y="50" width="8" height="8" className="text-white dark:text-card" />
      <rect x="8" y="52" width="4" height="4" className="text-foreground/80 dark:text-foreground/70" />

      {/* Data modules - scattered pixels */}
      {[
        [24,0],[28,0],[32,4],[36,0],[40,4],
        [0,24],[4,28],[8,24],[12,28],[16,24],
        [24,8],[28,12],[32,8],[36,12],[40,8],
        [24,16],[28,16],[36,16],[40,16],
        [24,24],[28,24],[32,24],[36,24],[40,24],[44,24],[48,24],[52,28],[56,24],[60,28],
        [24,28],[32,28],[40,28],[48,28],[56,28],
        [24,32],[28,32],[32,32],[36,32],[40,32],[44,32],[52,32],[60,32],
        [24,36],[32,36],[40,36],[48,36],[56,36],
        [24,40],[28,40],[36,40],[44,40],[52,40],[60,40],
        [0,36],[8,36],[16,36],[0,40],[12,40],
        [44,44],[48,48],[52,44],[56,48],[60,44],
        [44,52],[48,52],[56,52],[60,56],
        [44,60],[52,60],[60,60],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="4" height="4" className="text-foreground/80 dark:text-foreground/70" />
      ))}
    </svg>
  )
})

export function EScriptMockup() {
  return (
    <div className="relative px-4 pt-4 pb-2">
      {/* Phone container */}
      <div className="mx-auto w-44 rounded-2xl bg-foreground/5 dark:bg-white/[0.06] border border-border/40 p-2 space-y-2">
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

        {/* QR Code */}
        <div className="bg-white dark:bg-card rounded-lg border border-border/40 p-2 flex flex-col items-center gap-1">
          <QRCode />
          <span className="text-[7px] text-muted-foreground font-mono">eRx Token</span>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute bottom-1 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-card border border-border/40 shadow-md text-[9px] font-medium text-muted-foreground">
        <Pill className="w-3 h-3 text-emerald-500" />
        Works with any chemist
      </div>
    </div>
  )
}
