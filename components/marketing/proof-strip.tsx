import { Zap, MessageSquare, CheckCircle, CreditCard } from 'lucide-react'
import { proofMetrics } from '@/lib/marketing/homepage'

const iconMap = {
  Zap,
  MessageSquare,
  CheckCircle,
  CreditCard,
}

export function ProofStrip() {
  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {proofMetrics.map((metric) => {
            const Icon = iconMap[metric.icon as keyof typeof iconMap]
            
            return (
              <div 
                key={metric.label} 
                className="flex items-center gap-3 justify-center lg:justify-start"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
