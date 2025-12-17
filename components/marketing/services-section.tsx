import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { featuredServices } from '@/lib/marketing/homepage'

export function ServicesSection() {
  return (
    <section id="services" className="py-20 lg:py-28 bg-linear-to-b from-slate-50 to-white scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3">
            What we do
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Healthcare that respects your time
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Medical certificates and prescriptions — reviewed by real Australian GPs, delivered same-day.
          </p>
        </div>

        {/* Featured services grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-12">
          {featuredServices.map((service, index) => (
            <div 
              key={service.title}
              className="group relative bg-white rounded-2xl border border-slate-200/80 p-6 lg:p-8 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  
                  {/* Features list */}
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-lg font-semibold text-slate-900">
                    From ${service.priceFrom.toFixed(2)}
                  </span>
                  <Button 
                    asChild 
                    variant="ghost" 
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 -mr-2"
                  >
                    <Link href={service.href}>
                      Get started
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Simple CTA */}
        <div className="text-center">
          <p className="text-slate-500 text-sm">
            Questions? Check out our <Link href="/faq" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">FAQ</Link> or <Link href="/how-it-works" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">see how it works</Link>.
          </p>
        </div>
      </div>
    </section>
  )
}
