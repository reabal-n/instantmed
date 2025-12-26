"use client"

import { Star, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Spotlight } from '@/components/ui/glowing-effect'

const reviews = [
  {
    name: "Sarah M.",
    location: "Sydney",
    rating: 5,
    text: "Got my med cert in 20 mins. Lifesaver when you're actually sick and can't leave bed.",
    date: "2 days ago",
  },
  {
    name: "James K.",
    location: "Melbourne",
    rating: 5,
    text: "Finally a telehealth that doesn't make you wait 3 days. Script sorted same day.",
    date: "1 week ago",
  },
  {
    name: "Emma L.",
    location: "Brisbane",
    rating: 5,
    text: "Was skeptical but the doctor was legit thorough. Employer accepted my cert no questions.",
    date: "3 days ago",
  },
  {
    name: "Michael T.",
    location: "Perth",
    rating: 5,
    text: "4am and needed a script before my flight. Done in 15 mins. Unreal service.",
    date: "5 days ago",
  },
  {
    name: "Jessica W.",
    location: "Adelaide",
    rating: 5,
    text: "No awkward video call, just answered questions and got my prescription. So easy.",
    date: "1 week ago",
  },
  {
    name: "David R.",
    location: "Gold Coast",
    rating: 5,
    text: "Repeat script for my blood pressure meds. Usually takes a week to see my GP. This took 12 mins.",
    date: "4 days ago",
  },
  {
    name: "Sophie H.",
    location: "Canberra",
    rating: 5,
    text: "Real Australian doctors, not some overseas call centre. Actually listened to my concerns.",
    date: "6 days ago",
  },
  {
    name: "Chris B.",
    location: "Newcastle",
    rating: 5,
    text: "Pricing upfront, no hidden fees. Wish my regular GP was this transparent.",
    date: "2 weeks ago",
  },
  {
    name: "Lisa M.",
    location: "Hobart",
    rating: 5,
    text: "Got a sick note for work while lying in bed with the flu. This is how healthcare should work.",
    date: "3 days ago",
  },
  {
    name: "Ryan P.",
    location: "Darwin",
    rating: 5,
    text: "Living remote, nearest GP is 2 hours away. InstantMed is a game changer up here.",
    date: "1 week ago",
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-px">
      {[1, 2, 3, 4, 5].map((star) => (
        <div 
          key={star} 
          className={cn(
            "w-4 h-4 flex items-center justify-center",
            star <= rating ? "bg-[#00b67a]" : "bg-gray-300"
          )}
        >
          <Star className={cn(
            "w-2.5 h-2.5",
            star <= rating ? "text-white fill-white" : "text-gray-400"
          )} />
        </div>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: typeof reviews[0] }) {
  return (
    <div className="shrink-0 w-[300px] mx-2">
      <Spotlight color="oklch(0.65 0.15 160 / 0.12)" size={250}>
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 h-full transition-all duration-300 hover:border-[#00b67a]/30 hover:shadow-lg hover:shadow-[#00b67a]/5">
          <div className="flex items-center justify-between mb-2">
            <StarRating rating={review.rating} />
            <span className="text-[10px] text-zinc-400">{review.date}</span>
          </div>
          
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-3 line-clamp-2">
            {review.text}
          </p>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{review.name}</span>
            <span className="text-zinc-300 dark:text-zinc-600">•</span>
            <span className="flex items-center gap-0.5 text-zinc-500">
              <MapPin className="w-3 h-3" />
              {review.location}
            </span>
          </div>
        </div>
      </Spotlight>
    </div>
  )
}

export function TrustpilotReviews() {
  return (
    <section className="py-8 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Trustpilot header */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex gap-px">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-6 h-6 bg-[#00b67a] flex items-center justify-center">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
            ))}
          </div>
          <span className="text-lg font-semibold text-zinc-900 dark:text-white ml-1">Trustpilot</span>
        </div>
        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-white">4.9</span> • 2,847 reviews
        </div>
      </div>

      {/* Marquee container */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-zinc-50 dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-zinc-50 dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
        
        {/* Scrolling track */}
        <div className="flex animate-marquee hover:paused">
          {[...reviews, ...reviews].map((review, index) => (
            <ReviewCard key={`${review.name}-${index}`} review={review} />
          ))}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </section>
  )
}
