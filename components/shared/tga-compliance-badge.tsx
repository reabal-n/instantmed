import { Shield, CheckCircle2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface TGAComplianceBadgeProps {
  className?: string
  variant?: 'full' | 'compact' | 'inline'
}

/**
 * TGA (Therapeutic Goods Administration) compliance badge
 * Shows regulatory compliance for healthcare services
 */
export function TGAComplianceBadge({ 
  className,
  variant = 'compact'
}: TGAComplianceBadgeProps) {
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Shield className="w-3.5 h-3.5 text-emerald-600" />
        <span>TGA Compliant</span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10",
        className
      )}>
        <Shield className="w-4 h-4 text-emerald-600" />
        <span className="text-xs font-medium text-foreground">TGA Compliant</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white/50 dark:bg-white/5 rounded-xl border border-white/50 dark:border-white/10 p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-foreground text-sm mb-1">
            TGA Compliant Healthcare
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            Our services comply with Therapeutic Goods Administration regulations for telehealth and e-prescribing.
          </p>
          <Link 
            href="/compliance"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Learn more about our compliance
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Footer compliance section with all regulatory badges
 */
export function ComplianceFooterSection({ className }: { className?: string }) {
  const complianceItems = [
    {
      icon: Shield,
      title: 'AHPRA Registered',
      description: 'All doctors registered with Australian Health Practitioner Regulation Agency'
    },
    {
      icon: CheckCircle2,
      title: 'TGA Compliant',
      description: 'Compliant with Therapeutic Goods Administration regulations'
    },
    {
      icon: Shield,
      title: 'Privacy Act Compliant',
      description: 'Your health information protected under Australian Privacy Principles'
    },
  ]

  return (
    <div className={cn("border-t border-slate-200 dark:border-white/10 py-8", className)}>
      <div className="mx-auto max-w-5xl px-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-6">
          Regulatory Compliance
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {complianceItems.map((item) => (
            <div key={item.title} className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                <item.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <h4 className="font-medium text-foreground text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
