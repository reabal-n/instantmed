'use client'

import { Shield, CheckCircle2, Lock, FileCheck, Stethoscope, Building2, GraduationCap, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComplianceMarqueeProps {
  className?: string
  speed?: 'slow' | 'normal' | 'fast'
}

const complianceItems = [
  { icon: Shield, text: 'AHPRA Registered Doctors', highlight: true },
  { icon: GraduationCap, text: 'Medical Director Oversight' },
  { icon: CheckCircle2, text: 'TGA Compliant' },
  { icon: BookOpen, text: 'RACGP-Aligned Protocols' },
  { icon: Lock, text: 'Privacy Act Protected' },
  { icon: FileCheck, text: 'Legally Valid Certificates' },
  { icon: Stethoscope, text: 'Real Australian GPs' },
  { icon: Building2, text: 'Australian Owned' },
  { icon: Shield, text: 'Secure & Encrypted' },
  { icon: CheckCircle2, text: 'Medicare Compliant' },
]

/**
 * Scrolling compliance marquee for footer
 * Creates trust through continuous display of credentials
 */
export function ComplianceMarquee({ 
  className,
  speed = 'normal'
}: ComplianceMarqueeProps) {
  const speedClass = {
    slow: 'animate-marquee-slow',
    normal: 'animate-marquee',
    fast: 'animate-marquee-fast',
  }[speed]

  return (
    <div className={cn(
      "relative overflow-hidden bg-white/60 dark:bg-white/5 border-y border-white/50 dark:border-white/10 py-3",
      className
    )}>
      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-100 dark:from-slate-900 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-100 dark:from-slate-900 to-transparent z-10" />

      {/* Marquee content - duplicated for seamless loop */}
      <div className="flex whitespace-nowrap">
        <div className={cn("flex items-center gap-8 px-4", speedClass)}>
          {[...complianceItems, ...complianceItems].map((item, i) => (
            <div 
              key={i}
              className={cn(
                "flex items-center gap-2 text-sm",
                item.highlight 
                  ? "text-emerald-700 dark:text-emerald-400 font-medium" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 shrink-0",
                item.highlight ? "text-emerald-600" : "text-primary"
              )} />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Static compliance bar (non-scrolling alternative)
 */
export function ComplianceBar({ className }: { className?: string }) {
  const keyItems = complianceItems.slice(0, 4)

  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3 px-4 bg-white/50 dark:bg-white/5 border-y border-white/50 dark:border-white/10",
      className
    )}>
      {keyItems.map((item, i) => (
        <div 
          key={i}
          className={cn(
            "flex items-center gap-2 text-sm",
            item.highlight 
              ? "text-emerald-700 dark:text-emerald-400 font-medium" 
              : "text-muted-foreground"
          )}
        >
          <item.icon className={cn(
            "w-4 h-4 shrink-0",
            item.highlight ? "text-emerald-600" : "text-primary"
          )} />
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Compact trust strip for headers
 */
export function TrustStrip({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground",
      className
    )}>
      <div className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-emerald-600" />
        <span>AHPRA Verified</span>
      </div>
      <span className="text-muted-foreground/30">|</span>
      <div className="flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-primary" />
        <span>256-bit Encrypted</span>
      </div>
      <span className="text-muted-foreground/30">|</span>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
        <span>TGA Compliant</span>
      </div>
    </div>
  )
}
