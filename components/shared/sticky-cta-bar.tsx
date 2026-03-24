"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X, Clock } from "@/lib/icons"
import { usePathname } from "next/navigation"
import { PRICING_DISPLAY } from "@/lib/constants"

const SERVICE_CONFIG: Record<string, { name: string; price: string; href: string }> = {
  "/medical-certificate": { name: "Medical Certificate", price: `from ${PRICING_DISPLAY.MED_CERT}`, href: "/medical-certificate/new" },
  "/prescriptions": { name: "Prescription", price: PRICING_DISPLAY.REPEAT_SCRIPT, href: "/prescriptions/new" },
  "/general-consult": { name: "General Consult", price: PRICING_DISPLAY.CONSULT, href: "/request?service=consult" },
  "/hair-loss": { name: "Hair Loss Treatment", price: PRICING_DISPLAY.HAIR_LOSS, href: "/request?service=consult&subtype=hair_loss" },
}

const DEFAULT_CONFIG = { name: "Medical Certificate", price: `from ${PRICING_DISPLAY.MED_CERT}`, href: "/medical-certificate/new" }

// Context-aware CTA text based on which section is visible
const SECTION_CTA_MAP: Record<string, string> = {
  pricing: "See pricing",
  "how-it-works": "Get started",
  testimonials: "Join them",
  faq: "Still have questions?",
}

// Session limiting
const SESSION_KEY = "sticky_cta_shown"
const MAX_SHOWS_PER_SESSION = 1

export function StickyCTABar() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    const shown = sessionStorage.getItem(SESSION_KEY)
    return shown ? parseInt(shown, 10) >= MAX_SHOWS_PER_SESSION : false
  })
  const [isNearFooter, setIsNearFooter] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()

  // Get page-specific config
  const config = Object.entries(SERVICE_CONFIG).find(([path]) => pathname?.startsWith(path))?.[1] || DEFAULT_CONFIG

  // Context-aware CTA label
  const ctaLabel = (activeSection && SECTION_CTA_MAP[activeSection]) || "Start a request"

  const handleScroll = useCallback(() => {
    if (isDismissed) return

    // Show after scrolling past hero (400px)
    const scrolled = window.scrollY > 400

    // Hide when near footer
    const footer = document.querySelector("footer")
    if (footer) {
      const footerTop = footer.getBoundingClientRect().top
      const windowHeight = window.innerHeight
      setIsNearFooter(footerTop < windowHeight + 100)
    }

    setIsVisible(scrolled)
  }, [isDismissed])

  useEffect(() => {
    if (isDismissed) return

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isDismissed, handleScroll])

  // Detect which section is currently in view for context-aware CTA
  useEffect(() => {
    const sectionIds = Object.keys(SECTION_CTA_MAP)
    const observers: IntersectionObserver[] = []

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id)
        },
        { threshold: 0.3 }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [pathname])

  // Don't show on request flows or patient/doctor portals
  if (!pathname || pathname.includes("/request") || pathname.startsWith("/patient") || pathname.startsWith("/doctor")) {
    return null
  }

  const shouldShow = isVisible && !isDismissed && !isNearFooter

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 48 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="bg-card/95 dark:bg-white/10 backdrop-blur-xl border-t border-border/10 dark:border-white/10 px-4 py-3 safe-area-inset-bottom shadow-2xl dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5 truncate">
                  {config.name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {config.price} · Usually under an hour
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shrink-0 shadow-lg shadow-primary/25"
              >
                <Link href={config.href}>{ctaLabel}</Link>
              </Button>
              <button
                onClick={() => {
                  setIsDismissed(true)
                  if (typeof window !== "undefined") {
                    const current = parseInt(sessionStorage.getItem(SESSION_KEY) || "0", 10)
                    sessionStorage.setItem(SESSION_KEY, (current + 1).toString())
                  }
                }}
                className="p-1.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
