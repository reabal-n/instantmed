"use client"

import { motion } from "framer-motion"
import { Star, Users, Clock, ShieldCheck } from "lucide-react"
import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"

interface Testimonial {
  id: number
  name: string
  location: string
  rating: number
  text: string
  service: "med-cert" | "prescription"
  avatar: string
}

// Apple-style memoji/notion avatar URLs
const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah M.",
    location: "Sydney",
    rating: 5,
    text: "Got my medical certificate in under 30 minutes. The doctor was professional and the whole process was seamless.",
    service: "med-cert",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Sarah&backgroundColor=b6e3f4",
  },
  {
    id: 2,
    name: "James K.",
    location: "Melbourne",
    rating: 5,
    text: "Finally a telehealth that doesn't make you wait 3 days. Script sorted same day.",
    service: "prescription",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=James&backgroundColor=c0aede",
  },
  {
    id: 3,
    name: "Emma L.",
    location: "Brisbane",
    rating: 5,
    text: "Was skeptical but the doctor was legit thorough. Employer accepted my cert no questions.",
    service: "med-cert",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Emma&backgroundColor=ffd5dc",
  },
  {
    id: 4,
    name: "Michael T.",
    location: "Perth",
    rating: 5,
    text: "4am and needed a script before my flight. Done in 15 mins. Unreal service.",
    service: "prescription",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Michael&backgroundColor=d1f4d1",
  },
  {
    id: 5,
    name: "Jessica W.",
    location: "Adelaide",
    rating: 5,
    text: "No awkward video call, just answered questions and got my prescription. So easy.",
    service: "prescription",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Jessica&backgroundColor=ffdfba",
  },
  {
    id: 6,
    name: "David R.",
    location: "Gold Coast",
    rating: 5,
    text: "Repeat script for my blood pressure meds. Usually takes a week to see my GP. This took 12 mins.",
    service: "prescription",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=David&backgroundColor=bae1ff",
  },
  {
    id: 7,
    name: "Sophie H.",
    location: "Canberra",
    rating: 5,
    text: "Real Australian doctors, not some overseas call centre. Actually listened to my concerns.",
    service: "med-cert",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Sophie&backgroundColor=e0bbff",
  },
  {
    id: 8,
    name: "Chris B.",
    location: "Newcastle",
    rating: 5,
    text: "Pricing upfront, no hidden fees. Wish my regular GP was this transparent.",
    service: "med-cert",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Chris&backgroundColor=c1e7c1",
  },
  {
    id: 9,
    name: "Lisa M.",
    location: "Hobart",
    rating: 5,
    text: "Got a sick note for work while lying in bed with the flu. This is how healthcare should work.",
    service: "med-cert",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Lisa&backgroundColor=ffc8dd",
  },
  {
    id: 10,
    name: "Ryan P.",
    location: "Darwin",
    rating: 5,
    text: "Living remote, nearest GP is 2 hours away. InstantMed is a game changer up here.",
    service: "prescription",
    avatar: "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Ryan&backgroundColor=a2d2ff",
  },
]

// Convert testimonials to column format
const testimonialsForColumns = testimonials.map((t) => ({
  text: `"${t.text}"`,
  image: t.avatar,
  name: t.name,
  role: t.location,
}))

export function TestimonialMarquee() {
  return (
    <>
      <TestimonialsColumnsWrapper
        testimonials={testimonialsForColumns}
        title="Real patients. Real results."
        subtitle="See why thousands of Australians choose InstantMed."
        badgeText="4.9 ★ from 2,400+ reviews"
        className="py-16 lg:py-20 bg-content2/30"
      />

      {/* CRO Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="max-w-4xl mx-auto mt-12 px-4 pb-16"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {[
            { value: "4.9", label: "Rating", showStars: true },
            { value: "12 min", label: "Avg. response" },
            { value: "10,000+", label: "Patients helped" },
            { value: "98%", label: "Accepted by employers" },
          ].map((stat) => (
            <motion.div 
              key={stat.label}
              className="text-center p-4 rounded-xl bg-card/50 border border-border/50"
              whileHover={{ y: -2, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              {stat.showStars && (
                <div className="flex justify-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
        
        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-4 mt-8 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-500" />
            AHPRA registered doctors
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-500" />
            Available 7 days a week
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-sky-500" />
            100% Australian-based
          </span>
        </div>
      </motion.div>
    </>
  )
}
