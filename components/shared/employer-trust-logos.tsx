import { cn } from '@/lib/utils'

interface EmployerTrustLogosProps {
  className?: string
  variant?: 'full' | 'compact' | 'inline'
}

// Placeholder logos - in production these would be actual employer/uni logos
const trustedBy = [
  { name: 'Commonwealth Bank', category: 'employer' },
  { name: 'Woolworths', category: 'employer' },
  { name: 'Telstra', category: 'employer' },
  { name: 'BHP', category: 'employer' },
  { name: 'University of Sydney', category: 'university' },
  { name: 'University of Melbourne', category: 'university' },
  { name: 'UNSW', category: 'university' },
  { name: 'Monash University', category: 'university' },
]

/**
 * Employer and university trust logos
 * Shows that certificates are accepted by major organizations
 */
export function EmployerTrustLogos({ 
  className,
  variant = 'full'
}: EmployerTrustLogosProps) {
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <span>Accepted by</span>
        <div className="flex items-center gap-3">
          {trustedBy.slice(0, 3).map((org) => (
            <span key={org.name} className="font-medium text-foreground/70">
              {org.name}
            </span>
          ))}
          <span>+ more</span>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-4 py-4 px-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800",
        className
      )}>
        <span className="text-sm text-muted-foreground shrink-0">Accepted by:</span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {trustedBy.slice(0, 4).map((org) => (
            <div 
              key={org.name}
              className="h-6 flex items-center"
            >
              <span className="text-sm font-medium text-foreground/60">{org.name}</span>
            </div>
          ))}
          <span className="text-sm text-muted-foreground">+ 500 more</span>
        </div>
      </div>
    )
  }

  return (
    <section className={cn("py-12 border-y border-slate-200 dark:border-slate-800", className)}>
      <div className="mx-auto max-w-5xl px-4">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Our medical certificates are accepted by all Australian employers and universities, including:
        </p>

        {/* Employers */}
        <div className="mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-4">
            Major Employers
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {trustedBy.filter(o => o.category === 'employer').map((org) => (
              <div 
                key={org.name}
                className="h-8 flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                <span className="text-sm font-medium text-foreground/70">{org.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Universities */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-4">
            Universities
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {trustedBy.filter(o => o.category === 'university').map((org) => (
              <div 
                key={org.name}
                className="h-8 flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                <span className="text-sm font-medium text-foreground/70">{org.name}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          All certificates issued by AHPRA-registered doctors are legally valid for any Australian employer or institution.
        </p>
      </div>
    </section>
  )
}

/**
 * Simple "Accepted everywhere" badge
 */
export function AcceptedEverywhereTag({ className }: { className?: string }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800",
      className
    )}>
      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
        Accepted by all employers
      </span>
    </div>
  )
}
