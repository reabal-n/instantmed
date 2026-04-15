'use client'

import { AnimatePresence,motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useEffect,useState } from 'react'

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

interface HeroTestimonialRotatorProps {
  className?: string
}

export function HeroTestimonialRotator({ className }: HeroTestimonialRotatorProps) {
  const [index, setIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % heroTestimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const current = heroTestimonials[index]

  return (
    <div className={cn('relative min-h-[60px]', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={prefersReducedMotion ? {} : { y: 6 }}
          animate={{ y: 0 }}
          exit={prefersReducedMotion ? {} : { y: -6 }}
          transition={{ duration: 0.3 }}
        >
          {/* Stars */}
          <div className="flex items-center gap-0.5 mb-1.5">
            {Array.from({ length: current.rating }).map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
          {/* Quote */}
          <p className="text-xs text-muted-foreground/70 italic leading-relaxed max-w-sm">
            &ldquo;{current.quote}&rdquo;
          </p>
          {/* Attribution */}
          <p className="text-[10px] text-muted-foreground/50 mt-1">
            - {current.name}, {current.location}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
