'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Testimonial {
  id: number
  content: string
  author: string
  role: string
  rating: number
  avatar: string
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    content: "I needed a medical certificate urgently for work and InstantMed delivered within an hour. The process was seamless and the doctor was thorough in their assessment.",
    author: "Sarah M.",
    role: "Marketing Manager, Sydney",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 2,
    content: "As a busy parent, I don't have time to sit in waiting rooms. InstantMed let me get my prescription renewed while the kids were at school. Game changer!",
    author: "Michael T.",
    role: "Parent of 3, Melbourne",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 3,
    content: "The doctor actually read my symptoms and asked follow-up questions. It felt more thorough than some in-person visits I've had. Highly recommend.",
    author: "Emma L.",
    role: "University Student, Brisbane",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 4,
    content: "Got my prescription at 10pm on a Sunday. The fact that I didn't have to wait until Monday to see a GP was incredible. Worth every cent.",
    author: "David K.",
    role: "Shift Worker, Perth",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
  },
]

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const next = () => {
    setIsAutoPlaying(false)
    setCurrent((prev) => (prev + 1) % testimonials.length)
  }

  const prev = () => {
    setIsAutoPlaying(false)
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goTo = (index: number) => {
    setIsAutoPlaying(false)
    setCurrent(index)
  }

  return (
    <div className="relative">
      {/* Main testimonial card */}
      <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-slate-100 p-8 md:p-10">
        {/* Quote icon */}
        <div className="absolute top-6 left-6 w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
          <Quote className="w-5 h-5 text-teal-600" />
        </div>

        <div className="relative pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {[...Array(testimonials[current].rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Content */}
              <blockquote className="text-lg md:text-xl font-medium text-slate-700 leading-relaxed mb-6">
                &ldquo;{testimonials[current].content}&rdquo;
              </blockquote>

              {/* Author with avatar */}
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-100">
                  <Image
                    src={testimonials[current].avatar}
                    alt={testimonials[current].author}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    {testimonials[current].author}
                  </div>
                  <div className="text-sm text-slate-500">
                    {testimonials[current].role}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation dots and controls */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <div className="flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === current
                    ? 'w-6 bg-teal-500'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Page indicator */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              <span className="font-medium text-slate-600">{current + 1}</span>
              {' / '}
              {testimonials.length}
            </span>

            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-slate-200 hover:border-slate-300"
                onClick={prev}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full border-slate-200 hover:border-slate-300"
                onClick={next}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact testimonial card for grid layouts
export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <motion.div
      className="p-6 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div className="flex gap-1 mb-4">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        ))}
      </div>

      <p className="text-slate-600 text-sm mb-4 line-clamp-4">&ldquo;{testimonial.content}&rdquo;</p>

      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100">
          <Image
            src={testimonial.avatar}
            alt={testimonial.author}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
        <div>
          <div className="font-medium text-sm text-slate-900">{testimonial.author}</div>
          <div className="text-xs text-slate-500">{testimonial.role}</div>
        </div>
      </div>
    </motion.div>
  )
}
