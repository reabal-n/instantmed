"use client"

import { Shield, Clock, Lock, UserCheck, Award, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Trust Badges Component
 * 
 * Displays trust signals to increase conversion.
 * Use on landing pages, checkout, and form pages.
 */

interface TrustBadge {
  icon: React.ReactNode
  title: string
  description?: string
}

const TRUST_BADGES: TrustBadge[] = [
  {
    icon: <UserCheck className="w-5 h-5" />,
    title: "AHPRA-Registered Doctors",
    description: "All our doctors are registered with the Australian Health Practitioner Regulation Agency",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Reviewed Within an Hour",
    description: "Most requests are reviewed by a doctor within 60 minutes during business hours",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Bank-Level Security",
    description: "256-bit encryption protects your personal and medical information",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "No Certificate, No Charge",
    description: "If we can't help, you get a full refund",
  },
]

interface TrustBadgesProps {
  variant?: "horizontal" | "vertical" | "compact" | "minimal"
  showDescriptions?: boolean
  className?: string
  maxBadges?: number
}

export function TrustBadges({ 
  variant = "horizontal", 
  showDescriptions = true,
  className,
  maxBadges,
}: TrustBadgesProps) {
  const badges = maxBadges ? TRUST_BADGES.slice(0, maxBadges) : TRUST_BADGES

  if (variant === "minimal") {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground", className)}>
        {badges.map((badge, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-primary">{badge.icon}</span>
            <span>{badge.title}</span>
          </div>
        ))}
      </div>
    )
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-6", className)}>
        {badges.map((badge, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              {badge.icon}
            </div>
            <span className="font-medium text-foreground">{badge.title}</span>
          </div>
        ))}
      </div>
    )
  }

  if (variant === "vertical") {
    return (
      <div className={cn("space-y-4", className)}>
        {badges.map((badge, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
              {badge.icon}
            </div>
            <div>
              <h4 className="font-medium text-foreground">{badge.title}</h4>
              {showDescriptions && badge.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{badge.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Default: horizontal grid
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6", className)}>
      {badges.map((badge, i) => (
        <div 
          key={i} 
          className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm border border-white/20 dark:border-white/5"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-3">
            {badge.icon}
          </div>
          <h4 className="font-medium text-foreground text-sm">{badge.title}</h4>
          {showDescriptions && badge.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Single inline trust indicator
 * Use in forms or checkout flows
 */
interface TrustIndicatorProps {
  type: "security" | "doctors" | "refund" | "speed"
  size?: "sm" | "md"
  className?: string
}

const INDICATOR_CONFIG = {
  security: {
    icon: <Lock />,
    text: "Secure & encrypted",
  },
  doctors: {
    icon: <UserCheck />,
    text: "AHPRA-registered doctors",
  },
  refund: {
    icon: <Shield />,
    text: "No certificate, no charge",
  },
  speed: {
    icon: <Clock />,
    text: "Reviewed within an hour",
  },
}

export function TrustIndicator({ type, size = "sm", className }: TrustIndicatorProps) {
  const config = INDICATOR_CONFIG[type]
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-muted-foreground",
      size === "sm" ? "text-xs" : "text-sm",
      className
    )}>
      <span className={cn("text-primary", size === "sm" ? "[&>svg]:w-3.5 [&>svg]:h-3.5" : "[&>svg]:w-4 [&>svg]:h-4")}>
        {config.icon}
      </span>
      <span>{config.text}</span>
    </div>
  )
}

/**
 * Security footer for checkout/payment pages
 */
export function SecurityFooter({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 py-4 border-t border-border/50", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5 text-green-600" />
        <span>256-bit SSL Encryption</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5 text-green-600" />
        <span>PCI-DSS Compliant</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
        <span>Stripe Secure Payments</span>
      </div>
    </div>
  )
}

/**
 * AHPRA badge for doctor verification
 */
export function AHPRABadge({ className }: { className?: string }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800",
      className
    )}>
      <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
        AHPRA Verified
      </span>
    </div>
  )
}

/**
 * Stats bar showing key metrics
 */
export function StatsBar({ className }: { className?: string }) {
  const stats = [
    { value: "50,000+", label: "Patients helped" },
    { value: "4.8★", label: "Average rating" },
    { value: "<1hr", label: "Typical response" },
    { value: "7 days", label: "Available weekly" },
  ]

  return (
    <div className={cn(
      "grid grid-cols-2 md:grid-cols-4 gap-4 py-6 px-4 rounded-2xl bg-linear-to-r from-primary/5 to-primary/10 border border-primary/10",
      className
    )}>
      {stats.map((stat, i) => (
        <div key={i} className="text-center">
          <div className="text-2xl font-bold text-primary">{stat.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
