"use client"

import { Clock,X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback,useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { PRICING_DISPLAY } from "@/lib/constants"

const SERVICE_CONFIG: Record<string, { name: string; price: string; href: string; wait: string }> = {
  "/medical-certificate": { name: "Medical Certificate", price: `from ${PRICING_DISPLAY.MED_CERT}`, href: "/medical-certificate/new", wait: "Usually under 30 min" },
  "/prescriptions": { name: "Prescription", price: PRICING_DISPLAY.REPEAT_SCRIPT, href: "/prescriptions/new", wait: "Usually within 1–2h" },
}

const DEFAULT_CONFIG = { name: "See a doctor", price: `from ${PRICING_DISPLAY.MED_CERT}`, href: "/request", wait: "Usually same day" }

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
  const pathname = usePathname()
  // Get page-specific config
  const config = Object.entries(SERVICE_CONFIG).find(([path]) => pathname?.startsWith(path))?.[1] || DEFAULT_CONFIG

  const handleScroll = useCallback(() => {
    if (isDismissed) return

    // Show once the hero CTA buttons leave the viewport (fallback: 500px)
    const heroCta = document.querySelector<HTMLElement>('[href="/request"]')
    const threshold = heroCta
      ? heroCta.getBoundingClientRect().bottom < 0
      : window.scrollY > 500

    // Hide when near footer
    const footer = document.querySelector("footer")
    if (footer) {
      const footerTop = footer.getBoundingClientRect().top
      const windowHeight = window.innerHeight
      setIsNearFooter(footerTop < windowHeight + 100)
    }

    setIsVisible(threshold)
  }, [isDismissed])

  useEffect(() => {
    if (isDismissed) return

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isDismissed, handleScroll])

  // Don't show on request flows, portals, or pages with their own sticky CTA
  if (
    !pathname ||
    pathname.includes("/request") ||
    pathname.startsWith("/patient") ||
    pathname.startsWith("/doctor") ||
    pathname.startsWith("/medical-certificate")
  ) {
    return null
  }

  const shouldShow = isVisible && !isDismissed && !isNearFooter

  // CSS transitions replace framer-motion - avoids Turbopack module factory race condition.
  // motion/AnimatePresence are not pre-loaded when this lazy chunk initialises.
  return (
    <div
      className={[
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "transition-[opacity,transform] duration-300 motion-reduce:transition-none",
        shouldShow ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12 pointer-events-none",
      ].join(" ")}
    >
      <div className="bg-card/95 dark:bg-white/10 backdrop-blur-xl border-t border-border/10 dark:border-white/10 px-4 py-3 safe-area-inset-bottom shadow-2xl dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5 truncate">
              {config.name}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {config.price} · {config.wait}
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shrink-0 shadow-lg shadow-primary/25"
          >
            <Link href={config.href}>Get started</Link>
          </Button>
          <button
            onClick={() => {
              setIsDismissed(true)
              if (typeof window !== "undefined") {
                const current = parseInt(sessionStorage.getItem(SESSION_KEY) || "0", 10)
                sessionStorage.setItem(SESSION_KEY, (current + 1).toString())
              }
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
