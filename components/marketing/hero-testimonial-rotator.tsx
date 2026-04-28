'use client'

import { AnimatePresence,motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useEffect,useRef,useState } from 'react'

import { useReducedMotion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

interface HeroTestimonial {
  quote: string
  name: string
  location: string
  rating: number
}

const heroTestimonials: HeroTestimonial[] = [
  { quote: "Got my cert in 20 mins. Employer accepted it no questions asked.", name: "Sarah M.", location: "Sydney", rating: 5 },
  { quote: "Migraine hit at 7pm Sunday. Certificate was in my inbox before bed.", name: "Chris P.", location: "Gold Coast", rating: 5 },
  { quote: "Mental health day. No awkward conversations. Just answered honestly.", name: "Marcus W.", location: "Melbourne", rating: 5 },
  { quote: "Needed my regular medication renewed. Sorted in about 20 minutes.", name: "David R.", location: "Sydney", rating: 5 },
  { quote: "Nearest GP is 45 mins drive. This genuinely fills a gap.", name: "Mark D.", location: "Townsville", rating: 5 },
]

const ROTATION_MS = 5000

interface HeroTestimonialRotatorProps {
  className?: string
}

export function HeroTestimonialRotator({ className }: HeroTestimonialRotatorProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  // Pause on hover, focus-within, reduced motion, or when tab is hidden.
  // Meets WCAG 2.2.2 (Pause, Stop, Hide) for auto-updating content > 5s.
  useEffect(() => {
    if (paused || prefersReducedMotion) return

    const tick = () => setIndex((prev) => (prev + 1) % heroTestimonials.length)
    const timer = window.setInterval(tick, ROTATION_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        window.clearInterval(timer)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [paused, prefersReducedMotion])

  const current = heroTestimonials[index]

  return (
    <div
      ref={containerRef}
      className={cn('relative min-h-[60px]', className)}
      role="region"
      aria-label="Patient testimonials"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={prefersReducedMotion ? {} : { y: 6 }}
          animate={{ y: 0 }}
          exit={prefersReducedMotion ? {} : { y: -6 }}
          transition={{ duration: 0.3 }}
        >
          {/* Stars */}
          <div className="flex items-center gap-0.5 mb-1.5" aria-hidden="true">
            {Array.from({ length: current.rating }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
          {/* Quote */}
          <p className="text-xs text-muted-foreground italic leading-relaxed max-w-sm">
            <span className="sr-only">{current.rating} out of 5 stars. </span>
            &ldquo;{current.quote}&rdquo;
          </p>
          {/* Attribution */}
          <p className="text-[11px] text-muted-foreground mt-1">
            {current.name}, {current.location}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
