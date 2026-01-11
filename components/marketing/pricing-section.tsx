'use client'

import Link from 'next/link'
import { Check, FileText, Pill, Stethoscope } from 'lucide-react'
import { Button } from '@/components/uix'
import { cn } from '@/lib/utils'
import { pricingTiers } from '@/lib/marketing/homepage'

const iconMap = {
  FileText,
  Pill,
  Stethoscope,
}

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-28 scroll-mt-20 relative overflow-hidden">
      <div className="w-full max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="font-handwritten text-xl text-blue-500 rotate-[-1deg]">
            Simple Pricing
          </div>
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-bold font-handwritten text-zinc-900 dark:text-white rotate-[-1deg]">
              Pay per consult. No subscriptions.
            </h2>
            <div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-44 h-3 bg-primary/20 
              rotate-[-1deg] rounded-full blur-sm"
            />
          </div>
          <p className="font-handwritten text-xl text-zinc-600 dark:text-zinc-400 rotate-[-1deg]">
            No hidden fees. Only pay when you need care.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, index) => (
            <div
              key={tier.name}
              className={cn(
                "relative group",
                "transition-all duration-300",
                index === 0 && "rotate-[-1deg]",
                index === 1 && "rotate-[1deg]",
                index === 2 && "rotate-[-2deg]"
              )}
            >
              {/* Card background with shadow */}
              <div
                className={cn(
                  "absolute inset-0 bg-white dark:bg-zinc-900",
                  "border-2 border-zinc-900 dark:border-white",
                  "rounded-lg shadow-[4px_4px_0px_0px] shadow-zinc-900 dark:shadow-white",
                  "transition-all duration-300",
                  "group-hover:shadow-[8px_8px_0px_0px]",
                  "group-hover:translate-x-[-4px]",
                  "group-hover:translate-y-[-4px]"
                )}
              />

              <div className="relative p-6">
                {/* Popular badge */}
                {tier.popular && (
                  <div
                    className="absolute -top-2 -right-2 bg-dawn-400 text-zinc-900 
                    font-handwritten px-3 py-1 rounded-full rotate-12 text-sm border-2 border-zinc-900"
                  >
                    Popular!
                  </div>
                )}

                <div className="mb-6">
                  {/* Icon */}
                  {tier.icon && (
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full mb-4",
                        "flex items-center justify-center",
                        "border-2 border-zinc-900 dark:border-white"
                      )}
                    >
                      {(() => {
                        const Icon = iconMap[tier.icon as keyof typeof iconMap]
                        return Icon ? <Icon className="w-6 h-6 text-indigo-500" /> : null
                      })()}
                    </div>
                  )}
                  <h3 className="font-handwritten text-2xl text-zinc-900 dark:text-white">
                    {tier.name}
                  </h3>
                  <p className="font-handwritten text-zinc-600 dark:text-zinc-400">
                    {tier.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6 font-handwritten">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-white">
                    ${tier.price.toFixed(2)}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400 ml-1">
                    AUD
                  </span>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 border-zinc-900 
                        dark:border-white flex items-center justify-center shrink-0"
                      >
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="font-handwritten text-lg text-zinc-900 dark:text-white">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  asChild
                  className={cn(
                    "w-full h-12 font-handwritten text-lg relative",
                    "border-2 border-zinc-900 dark:border-white",
                    "transition-all duration-300",
                    "shadow-[4px_4px_0px_0px] shadow-zinc-900 dark:shadow-white",
                    "hover:shadow-[6px_6px_0px_0px]",
                    "hover:translate-x-[-2px] hover:translate-y-[-2px]",
                    tier.popular
                      ? [
                          "bg-dawn-400 text-zinc-900",
                          "hover:bg-dawn-300",
                          "active:bg-dawn-400",
                          "dark:hover:bg-dawn-300",
                          "dark:active:bg-dawn-400",
                        ]
                      : [
                          "bg-zinc-50 dark:bg-zinc-800",
                          "text-zinc-900 dark:text-white",
                          "hover:bg-white dark:hover:bg-zinc-700",
                          "active:bg-zinc-50 dark:active:bg-zinc-800",
                        ]
                  )}
                >
                  <Link href={tier.href}>
                    {tier.cta}
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Additional note */}
        <p className="text-center font-handwritten text-zinc-600 dark:text-zinc-400 mt-12">
          All prices include GST. Full refund if we can&apos;t help.
        </p>

        {/* Decorative elements */}
        <div className="absolute -z-10 inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 left-20 text-4xl rotate-12 opacity-20">
            ✎
          </div>
          <div className="absolute bottom-40 right-20 text-4xl -rotate-12 opacity-20">
            ✏️
          </div>
        </div>
      </div>
    </section>
  )
}
