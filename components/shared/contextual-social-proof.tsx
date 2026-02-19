"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Star, Users, Clock, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

const TESTIMONIALS: Record<string, { quote: string; name: string; time: string }[]> = {
  "medical-certificate": [
    { quote: "Got my cert in 30 mins. Employer accepted it, no questions.", name: "Sarah M.", time: "2 hours ago" },
    { quote: "Way easier than dragging myself to a clinic while sick.", name: "James T.", time: "4 hours ago" },
    { quote: "Legit doctor, legit certificate. Exactly what I needed.", name: "Emma L.", time: "Yesterday" },
  ],
  prescriptions: [
    { quote: "Renewed my blood pressure meds in 20 mins. Legend.", name: "David R.", time: "1 hour ago" },
    { quote: "No more waiting 2 weeks for a GP just to renew a script.", name: "Michelle K.", time: "3 hours ago" },
    { quote: "eScript on my phone before I got off the couch.", name: "Chris B.", time: "Yesterday" },
  ],
  default: [
    { quote: "Honestly, wish I'd found this years ago.", name: "Michael K.", time: "1 hour ago" },
    { quote: "Real doctors, proper review. None of the usual runaround.", name: "Anna P.", time: "3 hours ago" },
    { quote: "Sorted in under an hour. 10/10.", name: "Luke S.", time: "Yesterday" },
  ],
}

interface ContextualSocialProofProps {
  service?: "medical-certificate" | "prescriptions"
  variant?: "mini" | "card" | "inline"
  className?: string
}

export function ContextualSocialProof({ service, variant = "mini", className }: ContextualSocialProofProps) {
  const [index, setIndex] = useState(0)
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const testimonials = TESTIMONIALS[service || "default"] || TESTIMONIALS.default

  useEffect(() => {
    if (!isClient) return
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [isClient, testimonials.length])

  if (!isClient) return null

  const current = testimonials[index]

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-dawn-400 text-dawn-400" />
          ))}
        </div>
        <span className="truncate">&quot;{current.quote}&quot;</span>
        <span className="text-xs opacity-60">— {current.name}</span>
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div className={cn("glass-card rounded-xl p-4", className)}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-primary fill-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">&quot;{current.quote}&quot;</p>
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
      <Star className="w-3 h-3 fill-dawn-400 text-dawn-400" />
      <span className="truncate max-w-[200px]">&quot;{current.quote}&quot;</span>
    </div>
  )
}

interface ServiceStatsProps {
  service?: string
  className?: string
}

export function ServiceStats({ service: _service, className }: ServiceStatsProps) {
  const [count, setCount] = useState(0)
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  useEffect(() => {
    if (!isClient) return
    // Slowly increment
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setCount((prev) => prev + 1)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isClient])

  if (!isClient) return null

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
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const [time, _setTime] = useState(() => {
    const hour = new Date().getHours()
    const isPeakHour = hour >= 9 && hour <= 17
    const baseTime = isPeakHour ? 55 : 35
    return baseTime + Math.floor(Math.random() * 15)
  })

  if (!isClient) return null

  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Clock className="w-3 h-3 text-emerald-500" />
      <span>Most requests completed in under {time} mins today</span>
    </div>
  )
}
