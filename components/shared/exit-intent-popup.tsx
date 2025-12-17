"use client"

import { useState, useEffect } from "react"
import { X, Gift, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false)
  const [hasShown, setHasShown] = useState(false)

  useEffect(() => {
    // Check if already shown this session
    if (sessionStorage.getItem("exitIntentShown")) {
      setHasShown(true)
      return
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when mouse leaves from the top of the page
      if (e.clientY <= 0 && !hasShown) {
        setIsVisible(true)
        setHasShown(true)
        sessionStorage.setItem("exitIntentShown", "true")
      }
    }

    document.addEventListener("mouseleave", handleMouseLeave)
    return () => document.removeEventListener("mouseleave", handleMouseLeave)
  }, [hasShown])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0A0F1C]/60 backdrop-blur-sm" onClick={() => setIsVisible(false)} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card rounded-3xl p-8 animate-scale-in shadow-2xl">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 p-2 hover:bg-[#0A0F1C]/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#00E2B5] to-[#00C9A0] flex items-center justify-center mx-auto mb-4 animate-bounce-gentle">
            <Gift className="w-8 h-8 text-[#0A0F1C]" />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Wait! Don't leave empty-handed
          </h2>

          <p className="text-muted-foreground mb-6">
            Get <span className="text-[#00E2B5] font-semibold">20% off</span> your first consultation. Because feeling
            sick AND broke is no fun.
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full rounded-full btn-premium text-[#0A0F1C] font-semibold h-12">
              <Link href="/medical-certificate">
                Claim My Discount
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>

            <button
              onClick={() => setIsVisible(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              No thanks, I like paying full price
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Code <span className="font-mono bg-[#00E2B5]/10 px-1.5 py-0.5 rounded">WELCOME20</span> applied at checkout
          </p>
        </div>
      </div>
    </div>
  )
}
