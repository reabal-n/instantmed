"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X, Zap, Shield, Clock, Star } from "lucide-react"

export function StickyCTABar() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const pathname = usePathname()

  // Don't show on patient/doctor dashboards or auth pages
  const shouldHide = pathname.startsWith("/patient") || 
                     pathname.startsWith("/doctor") || 
                     pathname.startsWith("/auth")

  useEffect(() => {
    if (isDismissed || shouldHide) return

    const handleScroll = () => {
      // Show after scrolling 400px
      setIsVisible(window.scrollY > 400)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isDismissed, shouldHide])

  if (!isVisible || isDismissed || shouldHide) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-in-up">
      {/* Trust indicators bar */}
      <div className="bg-[#0A0F1C] px-4 py-1.5 border-b border-white/5">
        <div className="flex items-center justify-center gap-4 text-[10px] text-white/70">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#00E2B5]" />
            AHPRA doctors
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#06B6D4]" />
            ~1 hour
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-[#F59E0B] fill-[#F59E0B]" />
            4.9/5
          </span>
        </div>
      </div>
      
      {/* Main CTA bar */}
      <div className="bg-[#0A0F1C]/95 backdrop-blur-lg border-t border-white/10 px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#00E2B5] flex-shrink-0" />
              <span className="truncate">Need a cert or script?</span>
            </p>
            <p className="text-xs text-white/60 truncate">Doctor-reviewed within ~1 hour</p>
          </div>
          <Button asChild size="sm" className="rounded-full btn-premium text-[#0A0F1C] font-semibold px-5 flex-shrink-0 shadow-lg shadow-[#00E2B5]/20">
            <Link href="/medical-certificate/request">Get Started</Link>
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
