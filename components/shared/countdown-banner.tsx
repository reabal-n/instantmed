"use client"

import { useState, useEffect } from "react"
import { X, Zap } from "lucide-react"
import Link from "next/link"

export function CountdownBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 34, seconds: 12 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!isVisible) return null

  const pad = (n: number) => n.toString().padStart(2, "0")

  return (
    <div className="bg-linear-to-r from-foreground to-[#1e293b] text-white py-2.5 px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-transparent to-primary/10 animate-gradient-shift" />

      <div className="container mx-auto flex items-center justify-center gap-4 text-sm relative">
        <Zap className="w-4 h-4 text-primary animate-pulse" />
        <span className="font-medium">
          <span className="hidden sm:inline">Limited time: </span>
          <span className="text-primary">20% OFF</span> your first consult
        </span>
        <div className="flex items-center gap-1 font-mono text-xs bg-white/10 rounded-lg px-2 py-1">
          <span className="bg-primary/20 px-1.5 py-0.5 rounded">{pad(timeLeft.hours)}</span>
          <span className="text-primary">:</span>
          <span className="bg-primary/20 px-1.5 py-0.5 rounded">{pad(timeLeft.minutes)}</span>
          <span className="text-primary">:</span>
          <span className="bg-primary/20 px-1.5 py-0.5 rounded">{pad(timeLeft.seconds)}</span>
        </div>
        <Link
          href="/medical-certificate"
          className="hidden sm:inline-flex items-center gap-1 text-primary hover:underline font-medium"
        >
          Claim now
          <span className="animate-bounce-gentle">→</span>
        </Link>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
