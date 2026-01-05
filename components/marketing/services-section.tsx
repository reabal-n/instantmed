'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button, Chip } from '@heroui/react'
import { featuredServices } from '@/lib/marketing/homepage'
import { SectionPill } from '@/components/ui/section-pill'
import { TiltCard } from '@/components/shared/tilt-card'
import { BlurFade } from '@/components/ui/blur-fade'

export function ServicesSection() {
  return (
    <section id="services" className="py-20 lg:py-28 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <BlurFade delay={0.1}>
          <div className="text-center mb-16">
            <SectionPill 
              emoji="🏥" 
              text="What we do" 
              hoverText="Same-day healthcare"
              className="mb-4"
            />
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 spacing-premium">
              Healthcare that respects your time
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Medical certificates and prescriptions — reviewed by real Australian GPs, delivered same-day.
            </p>
          </div>
        </BlurFade>

        {/* Featured services grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-12">
          {featuredServices.map((service, index) => (
            <BlurFade key={service.title} delay={0.2 + index * 0.1}>
              <TiltCard tiltAmount={8}>
                <div 
                  className="group relative card-premium-bg dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6 lg:p-8 hover:shadow-premium-lg dark:hover:bg-white/10 transition-all duration-300 shadow-premium h-full hover-lift card-shine"
                >
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  
                  {/* Features list */}
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
                  <Chip color="primary" variant="flat" size="sm">
                    From ${service.priceFrom.toFixed(2)}
                  </Chip>
                  <Button 
                    as={Link}
                    href={service.href}
                    variant="light"
                    color="primary"
                    className="magnetic-button scale-spring"
                    endContent={<ArrowRight className="h-4 w-4 icon-spin-hover" />}
                  >
                    Get started
                  </Button>
                </div>
              </div>
                </div>
              </TiltCard>
            </BlurFade>
          ))}
        </div>

        {/* Simple CTA */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            Questions? Check out our <Link href="/faq" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2">FAQ</Link> or <Link href="/how-it-works" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2">see how it works</Link>.
          </p>
        </div>
      </div>
    </section>
  )
}
