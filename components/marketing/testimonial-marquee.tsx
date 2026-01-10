"use client"

import { motion } from "framer-motion"
import { Star, Quote, Users, Clock, Award } from "lucide-react"
import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"

interface Testimonial {
  id: number
  name: string
  location: string
  rating: number
  text: string
  service: "med-cert" | "prescription"
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah M.",
    location: "Sydney",
    rating: 5,
    text: "Got my medical certificate in under 30 minutes. The doctor was professional and the whole process was seamless.",
    service: "med-cert",
  },
  {
    id: 2,
    name: "James T.",
    location: "Melbourne",
    rating: 5,
    text: "Finally, a telehealth service that actually works. Renewed my prescription without leaving home.",
    service: "prescription",
  },
  {
    id: 3,
    name: "Emma L.",
    location: "Brisbane",
    rating: 5,
    text: "I was skeptical at first, but InstantMed exceeded my expectations. Quick, easy, and legitimate.",
    service: "med-cert",
  },
  {
    id: 4,
    name: "Michael K.",
    location: "Perth",
    rating: 5,
    text: "As someone with a busy schedule, this service is a lifesaver. No more waiting rooms!",
    service: "prescription",
  },
  {
    id: 5,
    name: "Jessica W.",
    location: "Adelaide",
    rating: 5,
    text: "The doctor took time to understand my situation. Felt like a real consultation, not a rushed process.",
    service: "med-cert",
  },
  {
    id: 6,
    name: "David R.",
    location: "Gold Coast",
    rating: 5,
    text: "Incredibly convenient. Had my certificate emailed to me and my employer within the hour.",
    service: "med-cert",
  },
  {
    id: 7,
    name: "Sophie H.",
    location: "Canberra",
    rating: 5,
    text: "Real Australian doctors, not some overseas call centre. Actually listened to my concerns.",
    service: "prescription",
  },
  {
    id: 8,
    name: "Chris B.",
    location: "Newcastle",
    rating: 5,
    text: "Pricing upfront, no hidden fees. Wish my regular GP was this transparent.",
    service: "med-cert",
  },
  {
    id: 9,
    name: "Lisa M.",
    location: "Hobart",
    rating: 5,
    text: "Got a sick note for work while lying in bed with the flu. This is how healthcare should work.",
    service: "med-cert",
  },
]

// Convert testimonials to column format
const testimonialsForColumns = testimonials.map((t) => ({
  text: `"${t.text}"`,
  image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.name.replace(/[^a-zA-Z0-9]/g, '')}`,
  name: t.name,
  role: `${t.service === "med-cert" ? "Medical Certificate" : "Prescription"} • ${t.location}`,
}))

export function TestimonialMarquee() {
  return (
    <>
      <TestimonialsColumnsWrapper
        testimonials={testimonialsForColumns}
        title="What our patients say"
        subtitle="Join thousands of Australians who trust InstantMed for their healthcare needs."
        badgeText="Trusted by thousands"
        className="py-16 lg:py-20 bg-content2/30"
      />

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="max-w-3xl mx-auto mt-12 px-4 pb-16"
      >
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: Award, value: "4.9", label: "Average rating", showStars: true },
            { icon: Users, value: "10k+", label: "Happy patients" },
            { icon: Clock, value: "<15min", label: "Typical response" },
          ].map((stat) => (
            <motion.div 
              key={stat.label}
              className="text-center"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              {stat.showStars && (
                <div className="flex justify-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  )
}
