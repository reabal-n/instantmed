"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { CheckCircle, X } from "lucide-react"
import Image from "next/image"

const recentActions = [
  { name: "Sarah M.", location: "Sydney", action: "got a med cert", time: "2 mins ago", avatar: "/woman-30s-casual.jpg" },
  { name: "James T.", location: "Melbourne", action: "renewed a script", time: "5 mins ago", avatar: "/man-30s-casual.jpg" },
  { name: "Emma L.", location: "Brisbane", action: "got a referral", time: "8 mins ago", avatar: "/young-australian-woman-red-hair-professional-heads.jpg" },
  { name: "Michael K.", location: "Perth", action: "got a med cert", time: "12 mins ago", avatar: "/young-man-beard-headshot-casual-australian.jpg" },
  { name: "Jessica W.", location: "Adelaide", action: "renewed a script", time: "15 mins ago", avatar: "/professional-businesswoman-australian-headshot-con.jpg" },
  { name: "David R.", location: "Gold Coast", action: "got a med cert", time: "18 mins ago", avatar: "/young-australian-man-creative-professional-headsho.jpg" },
  { name: "Sophie H.", location: "Canberra", action: "got a referral", time: "22 mins ago", avatar: "/asian-woman-professional-headshot-warm-smile.jpg" },
  { name: "Chris B.", location: "Newcastle", action: "got a med cert", time: "25 mins ago", avatar: "/young-man-casual-headshot-australian-friendly.jpg" },
]

export function SocialProofPopup() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)
  const pathname = usePathname()

  // Don't show on patient/doctor dashboards or auth pages
  const shouldHide = pathname.startsWith("/patient") || 
                     pathname.startsWith("/doctor") || 
                     pathname.startsWith("/auth")

  useEffect(() => {
    // Don't show if user has interacted, on mobile, or on hidden pages
    if (hasInteracted || shouldHide) return
    if (typeof window !== "undefined" && window.innerWidth < 768) return

    // Show first popup after 8 seconds
    const initialTimer = setTimeout(() => {
      setIsVisible(true)
    }, 8000)

    return () => clearTimeout(initialTimer)
  }, [hasInteracted, shouldHide])

  useEffect(() => {
    if (!isVisible) return

    // Hide after 5 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false)
    }, 5000)

    // Show next one after 15 seconds total (5 visible + 10 hidden)
    const nextTimer = setTimeout(() => {
      if (!hasInteracted) {
        setCurrentIndex((prev) => (prev + 1) % recentActions.length)
        setIsVisible(true)
      }
    }, 15000)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(nextTimer)
    }
  }, [isVisible, hasInteracted])

  const current = recentActions[currentIndex]

  if (!isVisible || shouldHide) return null

  return (
    <div
      className="fixed bottom-24 left-4 z-40 animate-slide-in-left hidden md:block"
    >
      <div className="glass-card rounded-2xl p-4 shadow-xl max-w-xs cursor-pointer hover:scale-[1.02] transition-transform relative group">
        <button
          onClick={() => setHasInteracted(true)}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[#00E2B5]/30">
            <Image
              src={current.avatar}
              alt={current.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#00E2B5]/20 to-transparent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {current.name} from {current.location}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-[#00E2B5]" />
              Just {current.action}
              <span className="text-[#00E2B5] font-medium">{current.time}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
