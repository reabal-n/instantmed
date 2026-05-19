"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { PRICING_DISPLAY } from "@/lib/constants"

interface PricingStickyCtaProps {
  targetId: string
}

export function PricingStickyCta({ targetId }: PricingStickyCtaProps) {
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = document.getElementById(targetId)
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [targetId])

  return (
    <AnimatePresence>
      {showStickyCTA && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
          initial={prefersReducedMotion ? {} : { y: 100 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { y: 100 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="border-t border-border/50 bg-white/95 px-4 pb-3 pt-2.5 shadow-lg backdrop-blur-xl safe-area-pb dark:bg-card/95">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {PRICING_DISPLAY.FROM_MED_CERT}
              </p>
              <Button asChild size="sm" className="shrink-0 shadow-md shadow-primary/20">
                <Link href="/request">
                  Get started
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
