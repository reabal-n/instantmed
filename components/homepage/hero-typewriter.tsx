"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"

interface HeroVariant {
  id: string
  headline: string
  subheadline: string
  cta: string
}

const heroVariants: HeroVariant[] = [
  {
    id: "pants",
    headline: "Skip the waiting room. Keep your pants on.",
    subheadline:
      "Prescriptions, certs & referrals — no phone calls, no video. Just fill a form, real doctor reviews it.",
    cta: "Get started",
  },
  {
    id: "fast",
    headline: "Real doctors. Real fast. Real easy.",
    subheadline: "2-minute form. AHPRA-registered GP review. Your document within the hour.",
    cta: "Start now",
  },
  {
    id: "couch",
    headline: "Medical stuff, minus the hassle.",
    subheadline: "Prescriptions, med certs & referrals from your couch. Most done in under an hour.",
    cta: "Get sorted",
  },
]

export function HeroTypewriter() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const currentVariant = heroVariants[currentIndex]

  // Cycle through variants every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % heroVariants.length)
        setIsVisible(true)
      }, 300)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative px-4 pt-8 pb-12 sm:pt-12 sm:pb-16 overflow-hidden">
      {/* Subtle gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#00E2B5]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-3xl text-center">
        {/* Online indicator */}
        <div className="inline-flex items-center gap-2 rounded-full bg-[#0A0F1C] px-3 py-1.5 text-xs font-medium text-white mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E2B5] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E2B5]" />
          </span>
          Doctors online now
        </div>

        {/* Animated headline */}
        <h1
          className={`text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl xl:text-5xl transition-all duration-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {currentVariant.headline}
        </h1>

        {/* Subheadline */}
        <p
          className={`mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg transition-all duration-300 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          {currentVariant.subheadline}
        </p>

        {/* Search prompt */}
        <div className="mt-8 mx-auto max-w-md">
          <Link
            href="#conditions"
            className="group flex items-center gap-3 bg-white rounded-full px-5 py-3.5 border border-border/60 hover:border-border hover:shadow-lg hover:shadow-black/5 transition-all"
          >
            <Search className="h-5 w-5 text-muted-foreground/60" />
            <span className="text-muted-foreground text-left flex-1">What do you need help with today?</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-[#00E2B5] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

        {/* Trust badges inline */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span>✓ AHPRA-registered doctors</span>
          <span className="hidden sm:inline">•</span>
          <span>✓ Usually under 1 hour</span>
          <span className="hidden sm:inline">•</span>
          <span>✓ 4.9/5 from 200+ reviews</span>
        </div>
      </div>
    </section>
  )
}
