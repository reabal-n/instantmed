"use client"

import { useState, useEffect } from "react"
import { CheckCircle } from "lucide-react"

const recentActions = [
  { name: "Sarah M.", location: "Sydney", action: "got a med cert", time: "2 mins ago" },
  { name: "James T.", location: "Melbourne", action: "renewed a script", time: "5 mins ago" },
  { name: "Emma L.", location: "Brisbane", action: "got a med cert", time: "8 mins ago" },
  { name: "Michael K.", location: "Perth", action: "got a med cert", time: "12 mins ago" },
  { name: "Jessica W.", location: "Adelaide", action: "renewed a script", time: "15 mins ago" },
  { name: "David R.", location: "Gold Coast", action: "got a med cert", time: "18 mins ago" },
  { name: "Sophie H.", location: "Canberra", action: "renewed a script", time: "22 mins ago" },
  { name: "Chris B.", location: "Newcastle", action: "got a med cert", time: "25 mins ago" },
]

export function SocialProofPopup() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)

  useEffect(() => {
    // Don't show if user has interacted or on mobile
    if (hasInteracted || window.innerWidth < 768) return

    // Show first popup after 5 seconds
    const initialTimer = setTimeout(() => {
      setIsVisible(true)
    }, 5000)

    return () => clearTimeout(initialTimer)
  }, [hasInteracted])

  useEffect(() => {
    if (!isVisible) return

    // Hide after 4 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false)
    }, 4000)

    // Show next one after 12 seconds total (4 visible + 8 hidden)
    const nextTimer = setTimeout(() => {
      if (!hasInteracted) {
        setCurrentIndex((prev) => (prev + 1) % recentActions.length)
        setIsVisible(true)
      }
    }, 12000)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(nextTimer)
    }
  }, [isVisible, hasInteracted])

  const current = recentActions[currentIndex]

  if (!isVisible) return null

  return (
    <div
      className="fixed bottom-24 left-4 z-40 animate-slide-in-left hidden md:block"
      onClick={() => setHasInteracted(true)}
    >
      <div className="glass-card rounded-2xl p-4 pr-6 shadow-xl max-w-xs cursor-pointer hover:scale-[1.02] transition-transform">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#00E2B5] to-[#00C9A0] flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-[#0A0F1C]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {current.name} from {current.location}
            </p>
            <p className="text-xs text-muted-foreground">
              Just {current.action} <span className="text-[#00E2B5]">{current.time}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
