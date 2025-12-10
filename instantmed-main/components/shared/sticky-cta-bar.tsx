"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { X, Zap } from "lucide-react"

export function StickyCTABar() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (isDismissed) return

    const handleScroll = () => {
      // Show after scrolling 400px
      setIsVisible(window.scrollY > 400)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isDismissed])

  if (!isVisible || isDismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-in-up">
      <div className="bg-[#0A0F1C]/95 backdrop-blur-lg border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#00E2B5]" />
              Need a cert or script?
            </p>
            <p className="text-xs text-white/60">Most requests done in under 4 hours</p>
          </div>
          <Button asChild size="sm" className="rounded-full btn-premium text-[#0A0F1C] font-semibold px-5">
            <Link href="/medical-certificate">Start Now</Link>
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
