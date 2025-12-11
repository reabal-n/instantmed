"use client"

import { useState, useEffect } from "react"
import { Star, MapPin, CheckCircle2, TrendingUp } from "lucide-react"
import Image from "next/image"

// Simulated live activity data
const recentActivity = [
  { name: "Sarah", location: "Sydney", service: "med cert", timeAgo: "2 min" },
  { name: "James", location: "Melbourne", service: "prescription", timeAgo: "5 min" },
  { name: "Emma", location: "Brisbane", service: "med cert", timeAgo: "8 min" },
  { name: "David", location: "Perth", service: "referral", timeAgo: "12 min" },
  { name: "Priya", location: "Adelaide", service: "med cert", timeAgo: "15 min" },
  { name: "Tom", location: "Gold Coast", service: "prescription", timeAgo: "18 min" },
  { name: "Lisa", location: "Canberra", service: "pathology", timeAgo: "22 min" },
  { name: "Chris", location: "Hobart", service: "med cert", timeAgo: "25 min" },
]

interface LiveToast {
  id: number
  name: string
  location: string
  service: string
}

export function LiveActivityCounter() {
  const [todayCount, setTodayCount] = useState(47)
  const [toast, setToast] = useState<LiveToast | null>(null)
  const [toastVisible, setToastVisible] = useState(false)

  // Increment counter periodically to simulate live activity
  useEffect(() => {
    const interval = setInterval(() => {
      setTodayCount((prev) => prev + Math.floor(Math.random() * 2))
    }, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Show random toast notifications
  useEffect(() => {
    const showToast = () => {
      const activity = recentActivity[Math.floor(Math.random() * recentActivity.length)]
      setToast({
        id: Date.now(),
        name: activity.name,
        location: activity.location,
        service: activity.service,
      })
      setToastVisible(true)

      // Hide after 4 seconds
      setTimeout(() => {
        setToastVisible(false)
      }, 4000)
    }

    // Show first toast after 5 seconds, then every 15-25 seconds
    const initialTimeout = setTimeout(showToast, 5000)
    const interval = setInterval(showToast, 15000 + Math.random() * 10000)

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
          <div className="glass-card rounded-lg px-3 py-2 shadow-lg border border-[#00E2B5]/20 flex items-center gap-2 max-w-[280px]">
            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-[#00E2B5]/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {toast.name} from {toast.location}
              </p>
              <p className="text-[10px] text-muted-foreground">just got their {toast.service}</p>
            </div>
          </div>
        )}
      </div>

      {/* Requests today counter - shown in stats bar */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <TrendingUp className="h-4 w-4 text-[#00E2B5]" />
        <span className="text-sm font-medium">
          <span className="tabular-nums">{todayCount}</span> requests today
        </span>
      </div>
    </>
  )
}

// Aggregate rating display
export function AggregateRating() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-4 w-4 ${i <= 5 ? "text-[#F59E0B] fill-[#F59E0B]" : "text-gray-200"}`} />
        ))}
      </div>
      <span className="text-sm font-semibold">4.9</span>
      <span className="text-xs text-muted-foreground">(200+ reviews)</span>
    </div>
  )
}

// Stats bar component
export function StatsBar() {
  return (
    <section className="px-4 py-3 sm:px-6 bg-[#0A0F1C] overflow-hidden">
      <div className="flex items-center justify-center gap-6 sm:gap-12 text-white/90">
        <LiveActivityCounter />
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

// Enhanced testimonial data
interface Testimonial {
  id: number
  quote: string
  name: string
  location: string
  service: string
  rating: number
  verified: boolean
  avatar: string
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote: "Had my cert within 40 minutes. Lifesaver when you wake up feeling awful.",
    name: "Sarah M.",
    location: "Bondi, NSW",
    service: "Medical Certificate",
    rating: 5,
    verified: true,
    avatar: "/young-australian-woman-with-blonde-hair-smiling-pr.jpg",
  },
  {
    id: 2,
    quote: "My GP was booked for weeks. This was so much easier for a simple repeat script.",
    name: "David K.",
    location: "South Yarra, VIC",
    service: "Prescription",
    rating: 5,
    verified: true,
    avatar: "/middle-aged-australian-man-with-glasses-friendly-p.jpg",
  },
  {
    id: 3,
    quote: "The referral was thorough. My cardiologist said it had everything they needed.",
    name: "Michelle T.",
    location: "Paddington, QLD",
    service: "Referral",
    rating: 5,
    verified: true,
    avatar: "/asian-australian-woman-professional-headshot-smili.jpg",
  },
  {
    id: 4,
    quote: "As a shift worker, getting to a doctor is hard. This just works.",
    name: "James L.",
    location: "Fremantle, WA",
    service: "Medical Certificate",
    rating: 5,
    verified: true,
    avatar: "/young-australian-man-with-beard-casual-friendly-he.jpg",
  },
  {
    id: 5,
    quote: "The doctor actually asked follow-up questions. Felt like a proper review.",
    name: "Priya N.",
    location: "Carlton, VIC",
    service: "Prescription",
    rating: 5,
    verified: true,
    avatar: "/indian-australian-woman-professional-headshot-smil.jpg",
  },
  {
    id: 6,
    quote: "Exam deadline + flu = stress. Had my cert before lunch. Thank you!",
    name: "Tom H.",
    location: "Newtown, NSW",
    service: "Medical Certificate",
    rating: 5,
    verified: true,
    avatar: "/young-university-student-male-casual-headshot-frie.jpg",
  },
]

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="flex-shrink-0 w-[280px] sm:w-[320px] mx-2">
      <div className="glass-card rounded-xl p-4 h-full">
        <div className="flex items-center justify-between mb-3">
          <span
            className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full"
            style={{
              backgroundColor:
                testimonial.service === "Medical Certificate"
                  ? "rgba(0, 226, 181, 0.1)"
                  : testimonial.service === "Prescription"
                    ? "rgba(6, 182, 212, 0.1)"
                    : "rgba(139, 92, 246, 0.1)",
              color:
                testimonial.service === "Medical Certificate"
                  ? "#00E2B5"
                  : testimonial.service === "Prescription"
                    ? "#06B6D4"
                    : "#8B5CF6",
            }}
          >
            {testimonial.service}
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < testimonial.rating ? "text-[#F59E0B] fill-[#F59E0B]" : "text-gray-200"}`}
              />
            ))}
          </div>
        </div>

        <p className="text-foreground text-sm leading-relaxed mb-4">"{testimonial.quote}"</p>

        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 rounded-full overflow-hidden ring-2 ring-[#00E2B5]/20">
            <Image
              src={testimonial.avatar || "/placeholder.svg"}
              alt={testimonial.name}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold">{testimonial.name}</p>
              {testimonial.verified && <CheckCircle2 className="h-3 w-3 text-[#00E2B5]" />}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5" />
              {testimonial.location}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TestimonialCarousel() {
  const [isPaused, setIsPaused] = useState(false)
  const doubledTestimonials = [...testimonials, ...testimonials]

  return (
    <section className="px-4 py-12 sm:py-16 bg-mesh overflow-hidden">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <AggregateRating />
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            Real patients, real results
          </h2>
        </div>
      </div>

      {/* Infinite scroll marquee */}
      <div className="relative overflow-hidden py-2">
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-[#FAFBFC] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-[#FAFBFC] to-transparent z-10 pointer-events-none" />

        <div
          className="flex marquee-scroll"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          style={{ animationPlayState: isPaused ? "paused" : "running" }}
        >
          {doubledTestimonials.map((testimonial, index) => (
            <TestimonialCard key={`${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  )
}
