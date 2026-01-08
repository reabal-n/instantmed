"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { X, Zap } from "lucide-react"
import { usePathname } from "next/navigation"

const SERVICE_CONFIG: Record<string, { name: string; price: string; href: string }> = {
  "/medical-certificate": { name: "Medical Certificate", price: "$19.95", href: "/medical-certificate/new" },
  "/prescriptions": { name: "Prescription", price: "$29.95", href: "/prescriptions/new" },
  "/womens-health": { name: "Women's Health", price: "$29.95", href: "/prescriptions/new" },
  "/mens-health": { name: "Men's Health", price: "$29.95", href: "/prescriptions/new" },
  "/weight-loss": { name: "Weight Loss Consult", price: "$49.95", href: "/weight-loss/request" },
}

const DEFAULT_CONFIG = { name: "cert or script", price: "$19.95", href: "/medical-certificate/new" }

export function StickyCTABar() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isNearFooter, setIsNearFooter] = useState(false)
  const pathname = usePathname()

  // Get page-specific config
  const config = Object.entries(SERVICE_CONFIG).find(([path]) => pathname?.startsWith(path))?.[1] || DEFAULT_CONFIG

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

  // Don't show on request flows or patient dashboard
  if (!pathname || pathname.includes("/request") || pathname.startsWith("/patient") || pathname.startsWith("/doctor")) {
    return null
  }

  if (!isVisible || isDismissed || isNearFooter) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-in-up">
      <div className="bg-[#0A0F1C]/95 backdrop-blur-lg border-t border-white/10 px-4 py-3 safe-area-inset-bottom">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white flex items-center gap-1.5 truncate">
              <Zap className="w-4 h-4 text-[#2563EB] shrink-0" />
              {config.name}
            </p>
            <p className="text-xs text-white/60">From {config.price} · Under 1 hour</p>
          </div>
          <Button
            asChild
            size="sm"
            className="rounded-full btn-premium text-[#0A0F1C] font-semibold px-5 shrink-0"
          >
            <Link href={config.href}>Get Started</Link>
          </Button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-white/40 hover:text-white/70 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
