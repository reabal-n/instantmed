"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle2, Clock, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TiltCard } from "@/components/shared/tilt-card"

// A/B test variants for hero copy
interface HeroVariant {
  id: "urgency" | "trust" | "simplicity"
  headline: string
  highlightedText: string
  subheadline: string
  cta: string
  metrics: string[] // What to track for this variant
}

const heroVariants: HeroVariant[] = [
  {
    id: "urgency",
    headline: "Get your med cert",
    highlightedText: "in under an hour.",
    subheadline:
      "Quick. Private. Doctor-reviewed. Submit online now — most requests done within 60 minutes (8am–10pm AEST).",
    cta: "Get yours now",
    metrics: ["time_to_click", "bounce_rate", "conversion_rate", "urgency_scroll_depth"],
  },
  {
    id: "trust",
    headline: "10,000+ Aussies",
    highlightedText: "helped by real GPs.",
    subheadline:
      "Every request reviewed by AHPRA-registered Australian doctors. No bots. No shortcuts. Just proper care.",
    cta: "Join them",
    metrics: ["trust_badge_hover", "testimonial_clicks", "doctor_profile_views", "conversion_rate"],
  },
  {
    id: "simplicity",
    headline: "No phone calls.",
    highlightedText: "No video. Just results.",
    subheadline:
      "Fill out a 2-minute form. A real doctor reviews it. Get your certificate, script, or referral — usually within the hour.",
    cta: "Start now",
    metrics: ["form_starts", "step_completion", "time_on_page", "conversion_rate"],
  },
]

export function HeroTypewriter() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const currentVariant = heroVariants[currentIndex]
  const fullText = currentVariant.highlightedText

  const typeSpeed = 50
  const deleteSpeed = 30
  const pauseDuration = 3000

  const handleTyping = useCallback(() => {
    if (isPaused) return

    if (!isDeleting) {
      // Typing
      if (displayText.length < fullText.length) {
        setDisplayText(fullText.slice(0, displayText.length + 1))
      } else {
        // Finished typing, pause then delete
        setIsPaused(true)
        setTimeout(() => {
          setIsPaused(false)
          setIsDeleting(true)
        }, pauseDuration)
      }
    } else {
      // Deleting
      if (displayText.length > 0) {
        setDisplayText(displayText.slice(0, -1))
      } else {
        // Finished deleting, move to next variant
        setIsDeleting(false)
        setCurrentIndex((prev) => (prev + 1) % heroVariants.length)
      }
    }
  }, [displayText, isDeleting, isPaused, fullText])

  useEffect(() => {
    const timeout = setTimeout(handleTyping, isDeleting ? deleteSpeed : typeSpeed)
    return () => clearTimeout(timeout)
  }, [handleTyping, isDeleting])

  // Track which variant is shown (for analytics)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Log variant view for A/B testing
      console.log(`[Analytics] Hero variant shown: ${currentVariant.id}`, {
        metrics: currentVariant.metrics,
      })
    }
  }, [currentVariant])

  return (
    <section className="relative px-4 py-12 sm:py-16 lg:py-24 overflow-hidden">
      {/* Floating orbs - simplified */}
      <div className="hero-orb hero-orb-mint w-[500px] h-[500px] -top-[150px] left-1/4 opacity-50" />
      <div
        className="hero-orb hero-orb-cyan w-[350px] h-[350px] bottom-0 right-1/4 opacity-30"
        style={{ animationDelay: "-2s" }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Live badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full bg-[#0A0F1C] px-3 py-1.5 text-xs font-medium text-white mb-5 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0s", animationFillMode: "forwards" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E2B5] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00E2B5]"></span>
          </span>
          Doctors online 8am–10pm AEST
        </div>

        {/* Typewriter headline */}
        <h1
          className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl animate-fade-in-up opacity-0 min-h-[2.5em] sm:min-h-[2em]"
          style={{ animationDelay: "0.1s", animationFillMode: "forwards", fontFamily: "var(--font-display)" }}
        >
          {currentVariant.headline}{" "}
          <span className="text-gradient-mint">
            {displayText}
            <span className="animate-pulse">|</span>
          </span>
        </h1>

        {/* Subheadline - transitions with variant */}
        <p
          className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg animate-fade-in-up opacity-0 transition-opacity duration-300"
          style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
          key={currentVariant.id}
        >
          {currentVariant.subheadline}
        </p>

        {/* CTA buttons */}
        <div
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
        >
          <Button
            size="lg"
            asChild
            className="w-full sm:w-auto px-6 rounded-full btn-premium text-[#0A0F1C] font-semibold text-sm h-12 shadow-lg group"
            data-variant={currentVariant.id}
          >
            <Link href="#services">
              {currentVariant.cta}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full sm:w-auto px-6 rounded-full bg-white/60 backdrop-blur-sm border-[#0A0F1C]/10 hover:bg-white/80 h-12 text-sm font-medium"
          >
            <Link href="/how-it-works">How it works</Link>
          </Button>
        </div>

        {/* Trust badges - compact */}
        <div
          className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-[#0A0F1C]/5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#00E2B5]" />
            <span className="font-medium">AHPRA doctors</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-[#0A0F1C]/5">
            <Clock className="h-3.5 w-3.5 text-[#06B6D4]" />
            <span className="font-medium">~1 hour</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-[#0A0F1C]/5">
            <Star className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
            <span className="font-medium">4.9/5</span>
          </div>
        </div>
      </div>

      {/* Floating mockup card */}
      <div
        className="relative mx-auto mt-10 max-w-xs animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}
      >
        <TiltCard className="glass-card rounded-2xl p-4 animate-float">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Medical Certificate
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              Ready
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 bg-[#0A0F1C]/10 rounded-full flex-1" />
              <span className="text-[10px] text-muted-foreground">2 days</span>
            </div>
            <div className="h-2 bg-[#0A0F1C]/5 rounded-full w-3/4" />
          </div>
          <div className="mt-3 pt-3 border-t border-[#0A0F1C]/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7 rounded-full overflow-hidden ring-2 ring-[#00E2B5]/30">
                <Image
                  src="/female-doctor-professional-headshot-warm-smile-aus.jpg"
                  alt="Dr. Sarah Chen"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold">Dr. Sarah Chen</p>
                <p className="text-[8px] text-muted-foreground">Just now</p>
              </div>
            </div>
            <span className="text-[10px] font-medium text-[#00E2B5]">Download</span>
          </div>
        </TiltCard>
      </div>
    </section>
  )
}
