"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Eye, TrendingUp, Star } from "lucide-react"

const names = [
  "Sarah",
  "James",
  "Emma",
  "David",
  "Priya",
  "Tom",
  "Lisa",
  "Chris",
  "Amy",
  "Michael",
  "Jessica",
  "Daniel",
  "Sophie",
  "Ryan",
  "Olivia",
]
const locations = [
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Perth",
  "Adelaide",
  "Gold Coast",
  "Newcastle",
  "Canberra",
  "Hobart",
  "Darwin",
]
const services = ["med cert", "prescription", "referral", "blood test"]

export function DynamicSocialProof() {
  const [todayCount, setTodayCount] = useState(127)
  const [viewingCount, setViewingCount] = useState(14)
  const [toast, setToast] = useState<{ name: string; location: string; service: string } | null>(null)
  const [toastVisible, setToastVisible] = useState(false)

  // Rotate the counter randomly
  useEffect(() => {
    const interval = setInterval(
      () => {
        // Random increment between 0-3
        setTodayCount((prev) => prev + Math.floor(Math.random() * 4))
      },
      8000 + Math.random() * 7000,
    ) // Every 8-15 seconds
    return () => clearInterval(interval)
  }, [])

  // Randomly fluctuate viewing count
  useEffect(() => {
    const interval = setInterval(
      () => {
        setViewingCount((prev) => {
          const change = Math.floor(Math.random() * 5) - 2 // -2 to +2
          return Math.max(8, Math.min(25, prev + change))
        })
      },
      5000 + Math.random() * 5000,
    )
    return () => clearInterval(interval)
  }, [])

  // Show random toast notifications
  useEffect(() => {
    const showToast = () => {
      const name = names[Math.floor(Math.random() * names.length)]
      const location = locations[Math.floor(Math.random() * locations.length)]
      const service = services[Math.floor(Math.random() * services.length)]

      setToast({ name, location, service })
      setToastVisible(true)

      setTimeout(() => setToastVisible(false), 4500)
    }

    const initialTimeout = setTimeout(showToast, 3000)
    const interval = setInterval(showToast, 12000 + Math.random() * 8000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      {/* Live activity toast */}
      <div
        className={`fixed bottom-4 left-4 z-50 transition-all duration-500 ${
          toastVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {toast && (
          <div className="glass-card rounded-lg px-3 py-2.5 shadow-lg border border-[#00E2B5]/20 flex items-center gap-2.5 max-w-[300px]">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#00E2B5]/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {toast.name} from {toast.location}
              </p>
              <p className="text-xs text-muted-foreground">just got their {toast.service}</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Stats bar with dynamic counter
export function DynamicStatsBar() {
  const [todayCount, setTodayCount] = useState(127)

  useEffect(() => {
    const interval = setInterval(
      () => {
        setTodayCount((prev) => prev + Math.floor(Math.random() * 3))
      },
      10000 + Math.random() * 10000,
    )
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="px-4 py-3 sm:px-6 bg-[#0A0F1C] overflow-hidden">
      <div className="flex items-center justify-center gap-6 sm:gap-12 text-white/90">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <TrendingUp className="h-4 w-4 text-[#00E2B5]" />
          <span className="text-sm font-medium">
            <span className="tabular-nums">{todayCount}</span> requests today
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 whitespace-nowrap">
          <Star className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
          <span className="text-sm font-medium">4.9 star rating</span>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <CheckCircle2 className="h-4 w-4 text-[#06B6D4]" />
          <span className="text-sm font-medium">10,000+ helped</span>
        </div>
      </div>
    </section>
  )
}

// Page viewers indicator
export function PageViewers({ pageName = "this page" }: { pageName?: string }) {
  const [count, setCount] = useState(12)

  useEffect(() => {
    const interval = setInterval(
      () => {
        setCount((prev) => {
          const change = Math.floor(Math.random() * 5) - 2
          return Math.max(6, Math.min(28, prev + change))
        })
      },
      4000 + Math.random() * 4000,
    )
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Eye className="h-3.5 w-3.5" />
      <span>
        <span className="tabular-nums font-medium">{count}</span> people viewing {pageName}
      </span>
    </div>
  )
}

// Rotating review snippets for footer
const reviews = [
  { text: "Had my cert in 40 mins. Lifesaver!", author: "Sarah M." },
  { text: "So much easier than waiting at the GP.", author: "James K." },
  { text: "Quick, professional, no fuss.", author: "Michelle T." },
  { text: "The referral had everything my specialist needed.", author: "David L." },
  { text: "Perfect for busy shift workers like me.", author: "Priya N." },
]

export function RotatingReviews() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % reviews.length)
        setIsVisible(true)
      }, 300)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const review = reviews[currentIndex]

  return (
    <div className={`transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      <div className="flex items-center gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="h-3 w-3 text-[#F59E0B] fill-[#F59E0B]" />
        ))}
      </div>
      <p className="text-sm italic text-muted-foreground">"{review.text}"</p>
      <p className="text-xs text-muted-foreground mt-1">— {review.author}</p>
    </div>
  )
}
