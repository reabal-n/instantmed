"use client"

import { InfiniteSlider } from "@/components/ui/infinite-slider"
import { cn } from "@/lib/utils"
import { Shield, Lock, CheckCircle, Award, FileCheck, ShieldCheck } from "lucide-react"

const trustBadges = [
  {
    name: "LegitScript Certified",
    icon: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#1a365d] flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-[#48bb78]" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground/80">LegitScript</span>
          <span className="text-[10px] text-muted-foreground">Certified</span>
        </div>
      </div>
    ),
  },
  {
    name: "ISO 27001",
    icon: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-[#1e40af] flex items-center justify-center bg-white dark:bg-white/10">
          <span className="text-[8px] font-bold text-[#1e40af] dark:text-blue-400">ISO</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground/80">ISO 27001</span>
          <span className="text-[10px] text-muted-foreground">Certified</span>
        </div>
      </div>
    ),
  },
  {
    name: "HIPAA Compliant",
    icon: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground/80">HIPAA</span>
          <span className="text-[10px] text-muted-foreground">Compliant</span>
        </div>
      </div>
    ),
  },
  {
    name: "SOC 2 Type II",
    icon: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
          <span className="text-[7px] font-bold text-white">SOC</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground/80">SOC 2</span>
          <span className="text-[10px] text-muted-foreground">Type II</span>
        </div>
      </div>
    ),
  },
  {
    name: "256-bit SSL",
    icon: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground/80">256-bit SSL</span>
          <span className="text-[10px] text-muted-foreground">Encrypted</span>
        </div>
      </div>
    ),
  },
  {
    name: "AHPRA Registered",
    icon: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground/80">AHPRA</span>
          <span className="text-[10px] text-muted-foreground">Registered</span>
        </div>
      </div>
    ),
  },
  {
    name: "TGA Approved",
    icon: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground/80">TGA</span>
          <span className="text-[10px] text-muted-foreground">Approved</span>
        </div>
      </div>
    ),
  },
  {
    name: "PCI DSS",
    icon: (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground/80">PCI DSS</span>
          <span className="text-[10px] text-muted-foreground">Compliant</span>
        </div>
      </div>
    ),
  },
]

interface TrustBadgeSliderProps {
  className?: string
}

export function TrustBadgeSlider({ className }: TrustBadgeSliderProps) {
  return (
    <section className={cn("py-4 relative", className)}>
      <div
        className={cn(
          "overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        )}
      >
        <InfiniteSlider gap={48} speed={40} speedOnHover={20}>
          {trustBadges.map((badge) => (
            <div
              key={badge.name}
              className="flex items-center opacity-70 hover:opacity-100 transition-opacity duration-300"
            >
              {badge.icon}
            </div>
          ))}
        </InfiniteSlider>
      </div>
    </section>
  )
}
