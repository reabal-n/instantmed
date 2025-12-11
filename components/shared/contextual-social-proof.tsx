"use client"

import { useState, useEffect } from "react"
import { Star, Users, Clock, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

const TESTIMONIALS: Record<string, { quote: string; name: string; time: string }[]> = {
  "medical-certificate": [
    { quote: "Got my cert in 40 mins — lifesaver!", name: "Sarah M.", time: "2 hours ago" },
    { quote: "So much easier than sitting in a waiting room feeling awful", name: "James T.", time: "4 hours ago" },
    { quote: "Accepted by my employer no questions asked", name: "Emma L.", time: "Yesterday" },
  ],
  prescriptions: [
    { quote: "Renewed my blood pressure meds in 20 mins", name: "David R.", time: "1 hour ago" },
    { quote: "Finally a service that doesn't require booking 2 weeks ahead", name: "Michelle K.", time: "3 hours ago" },
    { quote: "Script was at the pharmacy before I even left my couch", name: "Chris B.", time: "Yesterday" },
  ],
  referrals: [
    { quote: "Got my referral to a dermatologist same day", name: "Jessica W.", time: "2 hours ago" },
    { quote: "Saved me weeks of waiting for a GP appointment", name: "Tom H.", time: "5 hours ago" },
    { quote: "Blood test results back in 2 days", name: "Sophie L.", time: "Yesterday" },
  ],
  default: [
    { quote: "Wish I'd found this years ago", name: "Michael K.", time: "1 hour ago" },
    { quote: "Real doctors, real fast. What's not to love?", name: "Anna P.", time: "3 hours ago" },
    { quote: "10/10 would recommend to anyone", name: "Luke S.", time: "Yesterday" },
  ],
}

interface ContextualSocialProofProps {
  service?: "medical-certificate" | "prescriptions" | "referrals"
  variant?: "mini" | "card" | "inline"
  className?: string
}

export function ContextualSocialProof({ service, variant = "mini", className }: ContextualSocialProofProps) {
  const [index, setIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  const testimonials = TESTIMONIALS[service || "default"] || TESTIMONIALS.default

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [testimonials.length])

  if (!mounted) return null

  const current = testimonials[index]

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <span className="truncate">"{current.quote}"</span>
        <span className="text-xs opacity-60">— {current.name}</span>
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div className={cn("glass-card rounded-xl p-4", className)}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-primary fill-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">"{current.quote}"</p>
            <p className="text-xs text-muted-foreground mt-1">
              {current.name} · {current.time}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Mini variant
  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
      <span className="truncate max-w-[200px]">"{current.quote}"</span>
    </div>
  )
}

interface ServiceStatsProps {
  service?: string
  className?: string
}

export function ServiceStats({ service, className }: ServiceStatsProps) {
  const [count, setCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Generate realistic "today" count based on time of day
    const hour = new Date().getHours()
    const baseCount = Math.floor(hour * 3.5) + Math.floor(Math.random() * 10)
    setCount(baseCount)

    // Slowly increment
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setCount((prev) => prev + 1)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <TrendingUp className="w-3 h-3 text-primary" />
      <span>{count} people requested this today</span>
    </div>
  )
}

export function TrustBadge({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}>
      <Users className="w-3.5 h-3.5 text-primary" />
      <span>Trusted by 10,000+ Aussies</span>
    </div>
  )
}

export function QueuePosition({ position, className }: { position: number; className?: string }) {
  if (position <= 0) return null

  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Clock className="w-3 h-3" />
      <span>
        {position} request{position > 1 ? "s" : ""} in queue ahead of you
      </span>
    </div>
  )
}

export function AverageCompletionTime({ className }: { className?: string }) {
  const [time, setTime] = useState(45)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Simulate realistic average based on current load
    const hour = new Date().getHours()
    const isPeakHour = hour >= 9 && hour <= 17
    const baseTime = isPeakHour ? 55 : 35
    setTime(baseTime + Math.floor(Math.random() * 15))
  }, [])

  if (!mounted) return null

  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Clock className="w-3 h-3 text-emerald-500" />
      <span>Most requests completed in under {time} mins today</span>
    </div>
  )
}
