"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"

const reviews = [
  {
    name: "Sarah M.",
    rating: 5,
    text: "Got my medical certificate in under 30 minutes. Incredibly fast and professional service!",
    date: "2 days ago",
    verified: true,
  },
  {
    name: "James K.",
    rating: 5,
    text: "So much easier than waiting at a GP. The doctor was thorough and my script was ready same day.",
    date: "1 week ago",
    verified: true,
  },
  {
    name: "Emily R.",
    rating: 5,
    text: "Perfect for busy professionals. Legit doctors, fast turnaround, and accepted by my employer.",
    date: "3 days ago",
    verified: true,
  },
]

function TrustpilotStar({ filled, delay = 0 }: { filled: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20, 
        delay: delay * 0.1 
      }}
      className="relative"
    >
      <div className={`w-6 h-6 ${filled ? "bg-[#00b67a]" : "bg-gray-200"} flex items-center justify-center`}>
        <Star 
          className={`w-4 h-4 ${filled ? "text-white fill-white" : "text-gray-400"}`} 
        />
      </div>
    </motion.div>
  )
}

function StarRating({ rating, small = false }: { rating: number; small?: boolean }) {
  const size = small ? "w-4 h-4" : "w-5 h-5"
  const starSize = small ? "w-3 h-3" : "w-3.5 h-3.5"
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <div 
          key={star} 
          className={`${size} ${star <= rating ? "bg-[#00b67a]" : "bg-gray-200"} flex items-center justify-center`}
        >
          <Star className={`${starSize} ${star <= rating ? "text-white fill-white" : "text-gray-400"}`} />
        </div>
      ))}
    </div>
  )
}

export function TrustpilotReviews() {
  return (
    <section className="py-6 relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Main Trust Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-4 mb-8"
        >
          {/* Trustpilot Logo Style */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <TrustpilotStar key={i} filled={true} delay={i} />
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2"
            >
              <span className="text-lg font-semibold text-foreground">Trustpilot</span>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span className="font-semibold text-foreground">4.9</span>
            <span>out of 5</span>
            <span className="text-muted-foreground/60">•</span>
            <span>Based on <span className="font-medium text-foreground">2,847</span> reviews</span>
          </motion.div>
        </motion.div>

        {/* Review Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((review, index) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: 0.3 + index * 0.15,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              whileHover={{ 
                y: -4, 
                transition: { duration: 0.2 } 
              }}
              className="glass-card rounded-2xl p-5 border border-white/20 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <StarRating rating={review.rating} small />
                {review.verified && (
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                    Verified
                  </span>
                )}
              </div>
              
              <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                &ldquo;{review.text}&rdquo;
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{review.name}</span>
                <span>{review.date}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>AHPRA Registered Doctors</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>256-bit Encryption</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Australian Owned</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
