import Link from 'next/link'
import { Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { pricingTiers } from '@/lib/marketing/homepage'

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-white scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3">
            Simple pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Transparent, upfront pricing
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            No hidden fees. No subscription required. Pay only when you need care.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 p-6 lg:p-8 transition-all",
                tier.popular 
                  ? "border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-500/10" 
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {tier.name}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {tier.description}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-slate-900">
                    ${tier.price.toFixed(2)}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                asChild 
                className={cn(
                  "w-full rounded-xl h-11",
                  tier.popular 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                )}
              >
                <Link href={tier.href}>
                  {tier.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Additional note */}
        <p className="text-center text-sm text-slate-500 mt-8">
          All prices include GST. Additional charges may apply for priority processing or complex requests.
        </p>
      </div>
    </section>
  )
}
