"use client"

import { useState, useEffect } from "react"
import { Clock, Users, X } from "lucide-react"

export function UrgencyBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const [activeUsers, setActiveUsers] = useState(47)

  useEffect(() => {
    // Simulate fluctuating active users
    const interval = setInterval(() => {
      setActiveUsers((prev) => {
        const change = Math.floor(Math.random() * 5) - 2 // -2 to +2
        return Math.max(35, Math.min(65, prev + change))
      })
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  return (
    <div className="bg-linear-to-r from-primary to-[#00C9A0] text-foreground py-2 px-4 relative">
      <div className="container mx-auto flex items-center justify-center gap-4 text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground/40"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground"></span>
            </span>
            <Users className="w-4 h-4" />
            <span>{activeUsers} people online now</span>
          </div>
          <span className="hidden sm:inline text-foreground/60">|</span>
          <div className="hidden sm:flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Average response: 2.4 hours today</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-foreground/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
