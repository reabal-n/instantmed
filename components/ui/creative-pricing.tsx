"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface PricingTier {
  name: string
  icon: React.ReactNode
  price: number
  description: string
  features: string[]
  popular?: boolean
  color: string
  href: string
}

interface CreativePricingProps {
  tag?: string
  title?: string
  description?: string
  tiers: PricingTier[]
}

function CreativePricing({
  tag = "Simple Pricing",
  title = "Transparent, Upfront Pricing",
  description = "No hidden fees. No subscriptions. Pay only when you need us.",
  tiers,
}: CreativePricingProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="text-center space-y-4 mb-12">
        <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          {tag}
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          {title}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier, index) => (
          <div
            key={tier.name}
            className={cn(
              "relative group",
              "transition-all duration-300",
              index === 1 && "md:-mt-4 md:mb-4"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 rounded-2xl",
                "bg-card border-2",
                tier.popular 
                  ? "border-primary shadow-lg shadow-primary/20" 
                  : "border-border",
                "transition-all duration-300",
                "group-hover:shadow-xl group-hover:-translate-y-1"
              )}
            />

            <div className="relative p-6">
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className="mb-6 pt-2">
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl mb-4",
                    "flex items-center justify-center",
                    "bg-gradient-to-br",
                    tier.color
                  )}
                >
                  {tier.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {tier.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tier.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">
                  ${tier.price}
                </span>
                <span className="text-muted-foreground ml-1">
                  per request
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {tier.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                asChild
                className={cn(
                  "w-full h-12 font-semibold",
                  tier.popular
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                <Link href={tier.href}>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { CreativePricing, type PricingTier }
