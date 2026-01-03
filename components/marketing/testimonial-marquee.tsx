"use client"

import { motion } from "framer-motion"
import { Star, Quote, Users, Clock, Award } from "lucide-react"
import { Card, CardBody, Chip } from "@heroui/react"

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
]

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="mx-2 w-[320px] shrink-0">
      <Card
        className="h-full bg-content1 border border-divider hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
        shadow="sm"
      >
        <CardBody className="p-5">
          {/* Quote icon */}
          <div className="absolute top-4 right-4 opacity-5">
            <Quote className="w-8 h-8 text-foreground" />
          </div>
          
          {/* Stars */}
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <Star
                key={i}
                className="w-4 h-4 fill-amber-400 text-amber-400"
              />
            ))}
          </div>
          
          {/* Text */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3">
            &ldquo;{testimonial.text}&rdquo;
          </p>
          
          {/* Author */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm">
              {testimonial.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{testimonial.name}</p>
              <p className="text-xs text-muted-foreground">{testimonial.location}</p>
            </div>
            <Chip
              size="sm"
              variant="flat"
              color={testimonial.service === "med-cert" ? "primary" : "secondary"}
              classNames={{
                base: "h-6",
                content: "text-[10px] font-medium"
              }}
            >
              {testimonial.service === "med-cert" ? "Med Cert" : "Script"}
            </Chip>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export function TestimonialMarquee() {
  const doubledTestimonials = [...testimonials, ...testimonials]

  return (
    <section className="py-16 lg:py-20 overflow-hidden bg-content2/30">
      {/* Section Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">Trusted by thousands</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            What our patients say
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Join thousands of Australians who trust InstantMed for their healthcare needs.
          </p>
        </motion.div>
      </div>

      {/* Scrolling testimonials */}
      <div className="relative mb-6">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-linear-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-linear-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <motion.div
          className="flex"
          animate={{
            x: [0, -324 * testimonials.length],
          }}
          transition={{
            x: {
              duration: 40,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {doubledTestimonials.map((testimonial, index) => (
            <TestimonialCard key={`${testimonial.id}-${index}`} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="max-w-3xl mx-auto mt-12 px-4"
      >
        <div className="grid grid-cols-3 gap-6">
          {[
            { icon: Award, value: "4.9", label: "Average rating", showStars: true },
            { icon: Users, value: "10k+", label: "Happy patients" },
            { icon: Clock, value: "<15min", label: "Typical response" },
          ].map((stat, _index) => (
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
    </section>
  )
}
