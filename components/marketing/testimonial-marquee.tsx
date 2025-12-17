"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"

interface Testimonial {
  id: number
  name: string
  location: string
  rating: number
  text: string
  service: "med-cert" | "prescription"
  avatar?: string
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
    text: "Professional service with real Australian doctors. Highly recommend for anyone needing quick medical care.",
    service: "prescription",
  },
  {
    id: 8,
    name: "Chris B.",
    location: "Newcastle",
    rating: 5,
    text: "The pricing is transparent and fair. No hidden fees, no surprises. Just great service.",
    service: "med-cert",
  },
]

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="relative group mx-3 w-[340px] shrink-0">
      {/* Glow effect on hover */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500" />
      
      {/* Card */}
      <div className="relative h-full rounded-2xl overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 p-6 shadow-lg shadow-indigo-500/5 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-indigo-500/15 group-hover:-translate-y-2 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30">
        {/* Quote icon */}
        <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
          <Quote className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        {/* Stars */}
        <div className="flex gap-0.5 mb-4">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star
              key={i}
              className="w-4 h-4 fill-amber-400 text-amber-400"
            />
          ))}
        </div>
        
        {/* Text */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-5 line-clamp-4">
          &ldquo;{testimonial.text}&rdquo;
        </p>
        
        {/* Author */}
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm">
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
            <p className="text-xs text-muted-foreground">{testimonial.location}</p>
          </div>
          {/* Service badge */}
          <div className="ml-auto">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              testimonial.service === "med-cert" 
                ? "bg-indigo-50 text-indigo-600" 
                : "bg-violet-50 text-violet-600"
            }`}>
              {testimonial.service === "med-cert" ? "Med Cert" : "Script"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TestimonialMarquee() {
  // Double the testimonials for seamless loop
  const doubledTestimonials = [...testimonials, ...testimonials]

  return (
    <section className="py-20 overflow-hidden bg-gradient-to-b from-transparent via-indigo-50/30 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-4"
          >
            Trusted by thousands
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mb-4"
          >
            What our patients say
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-2xl mx-auto"
          >
            Join thousands of Australians who trust InstantMed for their healthcare needs
          </motion.p>
        </div>
      </div>

      {/* First row - scrolling left */}
      <div className="relative mb-6">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <motion.div
          className="flex"
          animate={{
            x: [0, -50 * testimonials.length * 7.5],
          }}
          transition={{
            x: {
              duration: 60,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {doubledTestimonials.map((testimonial, index) => (
            <TestimonialCard key={`row1-${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>

      {/* Second row - scrolling right */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <motion.div
          className="flex"
          initial={{ x: -50 * testimonials.length * 7.5 }}
          animate={{
            x: [- 50 * testimonials.length * 7.5, 0],
          }}
          transition={{
            x: {
              duration: 60,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {[...doubledTestimonials].reverse().map((testimonial, index) => (
            <TestimonialCard key={`row2-${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="max-w-4xl mx-auto mt-16 px-4"
      >
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">4.9</div>
            <div className="flex justify-center gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Average rating</p>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">10k+</div>
            <p className="text-sm text-muted-foreground mt-3">Happy patients</p>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">&lt;30min</div>
            <p className="text-sm text-muted-foreground mt-3">Average response</p>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
