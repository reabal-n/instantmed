import { Shield, Phone, RefreshCw, UserX, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReassuranceStripProps {
  className?: string
  variant?: 'inline' | 'stacked' | 'compact'
  showItems?: ('no-account' | 'no-call' | 'refund' | 'fast' | 'doctors')[]
}

const REASSURANCE_ITEMS = {
  'no-account': {
    icon: UserX,
    text: 'No signup to get started',
    shortText: 'No signup needed',
  },
  'no-call': {
    icon: Phone,
    text: 'Most requests reviewed online',
    shortText: 'Async review',
  },
  'refund': {
    icon: RefreshCw,
    text: "Refund if we can't help",
    shortText: 'Refund policy',
  },
  'fast': {
    icon: Clock,
    text: 'Most requests done in under an hour',
    shortText: 'Under 1 hour',
  },
  'doctors': {
    icon: Shield,
    text: 'AHPRA-registered Australian doctors',
    shortText: 'AHPRA verified',
  },
} as const

/**
 * ReassuranceStrip - Friction-reduction messaging for key decision points
 * 
 * Placement recommendations:
 * - Above the fold on landing pages
 * - Adjacent to CTA buttons
 * - At intake flow entry points
 * 
 * Psychology: Addresses silent objections before they form
 * - "Do I need to create an account?" → No account needed
 * - "Will I have to talk on the phone?" → No call unless needed
 * - "What if it doesn't work out?" → Refund guarantee
 */
export function ReassuranceStrip({ 
  className,
  variant = 'inline',
  showItems = ['no-account', 'no-call', 'refund'],
}: ReassuranceStripProps) {
  const items = showItems
    .filter(key => key in REASSURANCE_ITEMS)
    .map(key => ({
      key,
      ...REASSURANCE_ITEMS[key],
    }))

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground',
        className
      )}>
        {items.map(({ key, icon: Icon, shortText }, i) => (
          <span key={key} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground/30 mr-1.5">·</span>}
            <Icon className="h-3 w-3 text-primary/60" aria-hidden="true" />
            <span>{shortText}</span>
          </span>
        ))}
      </div>
    )
  }

  if (variant === 'stacked') {
    return (
      <div className={cn(
        'space-y-2',
        className
      )}>
        {items.map(({ key, icon: Icon, text }) => (
          <div 
            key={key} 
            className="flex items-center gap-2.5 text-sm text-muted-foreground"
          >
            <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-3 w-3 text-primary" aria-hidden="true" />
            </div>
            <span>{text}</span>
          </div>
        ))}
      </div>
    )
  }

  // Inline variant (default)
  return (
    <div className={cn(
      'flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground',
      className
    )}>
      {items.map(({ key, icon: Icon, text }) => (
        <div key={key} className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary/70" aria-hidden="true" />
          <span>{text}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Minimal reassurance badge for tight spaces
 * Single most important message based on context
 */
export function ReassuranceBadge({ 
  type = 'refund',
  className,
}: { 
  type?: keyof typeof REASSURANCE_ITEMS
  className?: string 
}) {
  const item = REASSURANCE_ITEMS[type]
  const Icon = item.icon

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
      'bg-primary/5 border border-primary/10 text-sm text-muted-foreground',
      className
    )}>
      <Icon className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
      <span>{item.text}</span>
    </div>
  )
}
