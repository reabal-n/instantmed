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
  { icon: Stethoscope, text: 'Real Australian Doctors' },
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
      "relative overflow-hidden bg-white dark:bg-card border-y border-border/50 dark:border-white/10 py-3",
      className
    )}>
      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-muted dark:from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-muted dark:from-background to-transparent z-10" />

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
                item.highlight ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
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
      "flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3 px-4 bg-muted/50 dark:bg-white/5 border-y border-border/50 dark:border-white/10",
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
            item.highlight ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
          )} />
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  )
}
