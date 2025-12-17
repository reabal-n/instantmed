import Link from 'next/link'
import { Check, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { pricingTiers } from '@/lib/marketing/homepage'

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-background scroll-mt-20 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-[400px] h-[400px] rounded-full blur-[100px] opacity-30" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] rounded-full blur-[100px] opacity-30" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)' }} />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Simple pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Transparent, upfront pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No subscription required. Pay only when you need care.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "group relative flex flex-col rounded-3xl p-6 lg:p-8 transition-all duration-300 backdrop-blur-sm",
                tier.popular 
                  ? "bg-gradient-to-b from-indigo-500/10 to-violet-500/5 border-2 border-indigo-500/30 shadow-xl shadow-indigo-500/10 scale-[1.02]" 
                  : "bg-white/80 border border-gray-200/50 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1"
              )}
            >
              {/* Glow effect for popular */}
              {tier.popular && (
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-indigo-500/20 to-violet-500/20 -z-10 blur-xl opacity-50" />
              )}
              
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-3 h-3" />
                    Most popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {tier.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={cn(
                    "text-4xl font-bold",
                    tier.popular ? "text-gradient-primary" : "text-foreground"
                  )}>
                    ${tier.price.toFixed(2)}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      tier.popular ? "bg-indigo-100" : "bg-gray-100"
                    )}>
                      <Check className={cn(
                        "h-3 w-3",
                        tier.popular ? "text-indigo-600" : "text-gray-600"
                      )} />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                asChild 
                className={cn(
                  "w-full h-12",
                  tier.popular 
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25" 
                    : ""
                )}
                variant={tier.popular ? "default" : "outline"}
              >
                <Link href={tier.href}>
                  {tier.cta}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Additional note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          All prices include GST. Additional charges may apply for priority processing or complex requests.
        </p>
      </div>
    </section>
  )
}
