"use client"

import { useRef, useState } from "react"
import { Star, MapPin, CheckCircle2 } from "lucide-react"
import Image from "next/image"

interface Testimonial {
  id: number
  quote: string
  name: string
  location: string
  service: string
  date: string
  rating: number
  verified: boolean
  avatar: string
  emoji?: string
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote:
      "Woke up feeling awful and couldn't get into my GP. Filled out the form, and a doctor reviewed it within the hour. Had my certificate sorted before lunch.",
    name: "Sarah M.",
    location: "Bondi, NSW",
    service: "Medical Certificate",
    date: "2 days ago",
    rating: 5,
    verified: true,
    avatar: "/young-australian-woman-with-blonde-hair-smiling-pr.jpg",
    emoji: "☕",
  },
  {
    id: 2,
    quote:
      "Needed my blood pressure meds renewed but my regular GP was booked for weeks. The process was straightforward and the doctor actually reviewed my history properly.",
    name: "David K.",
    location: "South Yarra, VIC",
    service: "Prescription",
    date: "1 week ago",
    rating: 5,
    verified: true,
    avatar: "/middle-aged-australian-man-with-glasses-friendly-p.jpg",
    emoji: "💊",
  },
  {
    id: 3,
    quote:
      "The referral was thorough — my cardiologist mentioned it covered everything they needed. Much easier than trying to get a last-minute GP appointment.",
    name: "Michelle T.",
    location: "Paddington, QLD",
    service: "Referral",
    date: "3 days ago",
    rating: 5,
    verified: true,
    avatar: "/asian-australian-woman-professional-headshot-smili.jpg",
    emoji: "❤️",
  },
  {
    id: 4,
    quote:
      "As a shift worker, getting to a doctor during normal hours is really difficult. Being able to fill out a form and have it reviewed without a phone call was exactly what I needed.",
    name: "James L.",
    location: "Fremantle, WA",
    service: "Medical Certificate",
    date: "5 days ago",
    rating: 5,
    verified: true,
    avatar: "/young-australian-man-with-beard-casual-friendly-he.jpg",
    emoji: "🌙",
  },
  {
    id: 5,
    quote:
      "I appreciated that the doctor asked follow-up questions about my medication. It felt like a proper review, not just ticking boxes.",
    name: "Priya N.",
    location: "Carlton, VIC",
    service: "Prescription",
    date: "1 week ago",
    rating: 5,
    verified: true,
    avatar: "/indian-australian-woman-professional-headshot-smil.jpg",
    emoji: "✨",
  },
  {
    id: 6,
    quote:
      "Had an assignment deadline and was too unwell to sit the exam. The form was quick and the certificate came through within the hour. Really helpful service.",
    name: "Tom H.",
    location: "Newtown, NSW",
    service: "Medical Certificate",
    date: "4 days ago",
    rating: 5,
    verified: true,
    avatar: "/young-university-student-male-casual-headshot-frie.jpg",
    emoji: "🎓",
  },
  {
    id: 7,
    quote:
      "Simple process, no phone calls needed. The doctor reviewed everything and I had my document the same day. Would use again.",
    name: "Emma R.",
    location: "Fortitude Valley, QLD",
    service: "Referral",
    date: "2 weeks ago",
    rating: 5,
    verified: true,
    avatar: "/young-australian-woman-red-hair-professional-heads.jpg",
    emoji: "🌟",
  },
  {
    id: 8,
    quote:
      "Needed a carer's leave certificate when my mum got sick. The process was respectful and the turnaround was quick. Appreciated the care during a stressful time.",
    name: "Andrew C.",
    location: "Norwood, SA",
    service: "Medical Certificate",
    date: "1 week ago",
    rating: 5,
    verified: true,
    avatar: "/middle-aged-australian-man-kind-face-professional-.jpg",
    emoji: "💜",
  },
  {
    id: 9,
    quote:
      "I travel a lot for work and my scripts always seem to run out at the worst times. This service has been reliable whenever I've needed a repeat.",
    name: "Lisa W.",
    location: "Perth CBD, WA",
    service: "Prescription",
    date: "3 days ago",
    rating: 5,
    verified: true,
    avatar: "/professional-businesswoman-australian-headshot-con.jpg",
    emoji: "✈️",
  },
  {
    id: 10,
    quote:
      "The questionnaire asked relevant questions about my condition — you can tell a real doctor is reviewing these, not just an automated system.",
    name: "Chris B.",
    location: "Brunswick, VIC",
    service: "Prescription",
    date: "6 days ago",
    rating: 4,
    verified: true,
    avatar: "/young-australian-man-creative-professional-headsho.jpg",
    emoji: "🩺",
  },
]

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="shrink-0 w-[340px] sm:w-[380px] mx-3">
      <div className="glass-card rounded-2xl p-6 h-full hover-lift transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <span className="text-3xl">{testimonial.emoji || "💬"}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < testimonial.rating ? "text-[#F59E0B] fill-[#F59E0B]" : "text-gray-200"}`}
              />
            ))}
          </div>
        </div>

        <p className="text-foreground leading-relaxed mb-5 text-[15px]">&quot;{testimonial.quote}&quot;</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-full overflow-hidden ring-2 ring-[#00E2B5]/20">
              <Image
                src={testimonial.avatar || "/placeholder.svg"}
                alt={testimonial.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">{testimonial.name}</p>
                {testimonial.verified && <CheckCircle2 className="h-3.5 w-3.5 text-[#00E2B5]" />}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {testimonial.location}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-[#00E2B5]/10 text-[#00E2B5]">
              {testimonial.service}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TestimonialMarquee() {
  const [isPaused, setIsPaused] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Double the testimonials for seamless loop
  const doubledTestimonials = [...testimonials, ...testimonials]

  return (
    <div className="relative overflow-hidden py-4">
      {/* Gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-40 bg-linear-to-r from-[#FAFBFC] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-40 bg-linear-to-l from-[#FAFBFC] to-transparent z-10 pointer-events-none" />

      <div
        ref={scrollRef}
        className="flex marquee-scroll"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {doubledTestimonials.map((testimonial, index) => (
          <TestimonialCard key={`${testimonial.id}-${index}`} testimonial={testimonial} />
        ))}
      </div>
    </div>
  )
}
