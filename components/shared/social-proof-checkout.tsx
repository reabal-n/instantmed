"use client"

/**
 * Social Proof for Checkout/Decision Points
 * 
 * Subtle trust signals shown at critical decision moments.
 * Different from landing page testimonials - these are compact
 * and designed to not distract from the checkout flow.
 */

import { Users, Star, CheckCircle, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface SocialProofCheckoutProps {
  variant?: "badge" | "strip" | "mini-testimonial"
  className?: string
}

// Audit-safe social proof copy
const SOCIAL_PROOF = {
  customerCount: "5,000+",
  customerText: "Australians helped",
  rating: "4.8",
  ratingCount: "500+",
  satisfactionRate: "98%",
  testimonial: {
    text: "Quick and easy. Got my certificate within the hour.",
    author: "Sarah M.",
    location: "Sydney",
  },
}

/**
 * Compact social proof badge for placement near payment buttons
 */
export function SocialProofCheckout({
  variant = "badge",
  className,
}: SocialProofCheckoutProps) {
  if (variant === "mini-testimonial") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-xl",
          "bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10",
          className
        )}
      >
        <div className="flex gap-0.5 shrink-0 mt-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className="w-3 h-3 fill-amber-400 text-amber-400"
            />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            &ldquo;{SOCIAL_PROOF.testimonial.text}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            — {SOCIAL_PROOF.testimonial.author}, {SOCIAL_PROOF.testimonial.location}
          </p>
        </div>
      </div>
    )
  }

  if (variant === "strip") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-4 py-2 text-xs text-muted-foreground",
          className
        )}
      >
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary/70" />
          <span>
            <strong className="text-foreground">{SOCIAL_PROOF.customerCount}</strong>{" "}
            {SOCIAL_PROOF.customerText}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>
            <strong className="text-foreground">{SOCIAL_PROOF.rating}</strong> rating
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-green-600" />
          <span>
            <strong className="text-foreground">{SOCIAL_PROOF.satisfactionRate}</strong> satisfaction
          </span>
        </div>
      </div>
    )
  }

  // Badge variant (default) - most compact
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10",
        "text-xs text-muted-foreground",
        className
      )}
    >
      <div className="flex items-center gap-1">
        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
        <span>
          <strong className="text-foreground font-medium">{SOCIAL_PROOF.customerCount}</strong>{" "}
          {SOCIAL_PROOF.customerText}
        </span>
      </div>
    </div>
  )
}

/**
 * Minimal counter for very tight spaces
 */
export function SocialProofCounter({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        className
      )}
    >
      <Users className="w-3 h-3 text-primary/60" />
      <span>{SOCIAL_PROOF.customerCount} helped</span>
    </div>
  )
}
