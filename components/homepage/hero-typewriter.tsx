"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Search, Sparkles } from "lucide-react"
import { SparklesText } from "@/components/ui/sparkles-text"

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
      "Prescriptions & med certs — no phone calls, no video. Just fill a form, real doctor reviews it.",
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
    subheadline: "Prescriptions & med certs from your couch. Most done in under an hour.",
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
    <div className="relative mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full backdrop-blur-xl bg-white/60 dark:bg-black/40 border border-white/40 dark:border-white/10 px-4 py-1.5 text-xs font-medium mb-6 animate-fade-in">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E2B5] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E2B5]" />
        </span>
        <span className="text-foreground">Doctors online now</span>
      </div>

      <h1
        className={`text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl xl:text-6xl transition-all duration-500 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        <span className="inline-block">
          {(() => {
            const highlightPhrases = ["waiting room", "pants", "doctors", "fast", "easy", "hassle", "couch", "real"]
            const headline = currentVariant.headline
            const parts: Array<{ text: string; highlight: boolean }> = []
            let lastIndex = 0

            // Find all highlight phrases
            const matches: Array<{ start: number; end: number; phrase: string }> = []
            highlightPhrases.forEach((phrase) => {
              const regex = new RegExp(phrase, "gi")
              let match
              while ((match = regex.exec(headline)) !== null) {
                matches.push({ start: match.index, end: match.index + phrase.length, phrase })
              }
            })

            // Sort matches by start position
            matches.sort((a, b) => a.start - b.start)

            // Build parts array
            matches.forEach((match) => {
              if (match.start > lastIndex) {
                parts.push({ text: headline.substring(lastIndex, match.start), highlight: false })
              }
              parts.push({ text: headline.substring(match.start, match.end), highlight: true })
              lastIndex = match.end
            })

            if (lastIndex < headline.length) {
              parts.push({ text: headline.substring(lastIndex), highlight: false })
            }

            // If no matches, split by words
            if (parts.length === 0) {
              return headline.split(" ").map((word, i) => (
                <span key={i} className="inline-block mr-2">
                  <span className="text-foreground">{word}</span>
                </span>
              ))
            }

            return parts.map((part, i) => (
              <span key={i} className="inline-block">
                {part.highlight ? (
                  <span className="relative inline-block mr-2">
                    <SparklesText
                      text={part.text}
                      className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold bg-linear-to-r from-[#00e2b5] via-[#06B6D4] to-[#8B5CF6] bg-clip-text text-transparent"
                      colors={{ first: "#00e2b5", second: "#8B5CF6" }}
                      sparklesCount={6}
                    />
                  </span>
                ) : (
                  <span className="text-foreground mr-2">{part.text}</span>
                )}
              </span>
            ))
          })()}
        </span>
      </h1>

      <p
        className={`mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg leading-relaxed transition-all duration-500 delay-75 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        {currentVariant.subheadline}
      </p>

      <div className="mt-8 mx-auto max-w-md animate-fade-in-up stagger-2">
        <Link
          href="#conditions"
          className="group flex items-center gap-3 backdrop-blur-xl bg-white/60 dark:bg-black/20 rounded-2xl px-5 py-4 border border-white/40 dark:border-white/10 hover:border-white/60 dark:hover:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,226,181,0.15)] transition-all duration-300 hover:-translate-y-1"
        >
          <Search className="h-5 w-5 text-muted-foreground/60" />
          <span className="text-muted-foreground text-left flex-1">What do you need help with today?</span>
          <ArrowRight className="h-4 w-4 text-[#00E2B5] group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground animate-fade-in-up stagger-3">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#00E2B5]" />
          AHPRA-registered doctors
        </span>
        <span className="hidden sm:inline text-border">•</span>
        <span>Usually under 1 hour</span>
        <span className="hidden sm:inline text-border">•</span>
        <span>4.9/5 from 200+ reviews</span>
      </div>
    </div>
  )
}
