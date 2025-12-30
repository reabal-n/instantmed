'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { spring, duration, easing } from '@/lib/motion'

// =============================================================================
// TYPES
// =============================================================================

export interface DisplayCard {
  /** Unique identifier */
  id: string
  /** Card title */
  title: string
  /** Card description/subtitle */
  description?: string
  /** Icon component */
  icon?: React.ReactNode
  /** Accent color for the card (CSS color or Tailwind class) */
  accentColor?: string
  /** Custom className for this card */
  className?: string
}

export interface DisplayCardsProps {
  /** Array of cards to display */
  cards: DisplayCard[]
  /** Maximum visible cards in the stack */
  maxVisible?: number
  /** Auto-rotate interval in ms (0 to disable) */
  autoRotateInterval?: number
  /** Stack direction */
  direction?: 'up' | 'down'
  /** Custom className */
  className?: string
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const cardVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 60 : -60,
    scale: 0.9,
    opacity: 0,
    rotateX: direction > 0 ? -15 : 15,
  }),
  center: (index: number) => ({
    y: index * -8,
    scale: 1 - index * 0.05,
    opacity: 1 - index * 0.15,
    rotateX: 0,
    zIndex: 10 - index,
    transition: {
      ...spring.smooth,
      opacity: { duration: duration.normal },
    },
  }),
  exit: (direction: number) => ({
    y: direction < 0 ? 60 : -60,
    scale: 0.9,
    opacity: 0,
    rotateX: direction < 0 ? -15 : 15,
    transition: {
      duration: duration.normal,
      ease: easing.in,
    },
  }),
}

const reducedVariants = {
  enter: { opacity: 0 },
  center: (index: number) => ({
    opacity: 1 - index * 0.15,
    zIndex: 10 - index,
    transition: { duration: 0.15 },
  }),
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

// =============================================================================
// SINGLE DISPLAY CARD
// =============================================================================

interface SingleCardProps {
  card: DisplayCard
  index: number
  total: number
  isTop: boolean
  reducedMotion: boolean
  direction: number
}

function SingleCard({ card, index, isTop, reducedMotion, direction }: SingleCardProps) {
  const variants = reducedMotion ? reducedVariants : cardVariants

  return (
    <motion.div
      key={card.id}
      custom={reducedMotion ? index : direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      className={cn(
        'absolute inset-0',
        // Consistent radius with other cards
        'rounded-xl',
        // Glass card styling
        'bg-[var(--glass-bg-elevated)] backdrop-blur-xl',
        'border border-[var(--glass-border)]',
        'shadow-[var(--shadow-lg-value)]',
        // Hover effect for top card only
        isTop && 'cursor-pointer',
        card.className
      )}
      style={{
        // Only use 3D transforms when motion is allowed
        transformStyle: reducedMotion ? undefined : 'preserve-3d',
        perspective: reducedMotion ? undefined : '1000px',
      }}
    >
      {/* Accent gradient overlay */}
      {card.accentColor && (
        <div 
          className="absolute inset-0 rounded-xl opacity-10"
          style={{
            background: `linear-gradient(135deg, ${card.accentColor} 0%, transparent 60%)`,
          }}
        />
      )}
      
      {/* Card content */}
      <div className="relative z-10 p-6 h-full flex flex-col">
        {/* Icon */}
        {card.icon && (
          <div className="mb-4 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            {card.icon}
          </div>
        )}
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {card.title}
        </h3>
        
        {/* Description */}
        {card.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {card.description}
          </p>
        )}
        
        {/* Stack indicator dots */}
        <div className="mt-auto pt-4 flex items-center gap-1.5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                i === 0 ? 'bg-primary' : 'bg-border'
              )}
            />
          ))}
        </div>
      </div>
      
      {/* Subtle inner border glow */}
      <div className="absolute inset-[1px] rounded-xl pointer-events-none">
        <div className="absolute inset-0 rounded-xl bg-linear-to-b from-white/5 to-transparent" />
      </div>
    </motion.div>
  )
}

// =============================================================================
// DISPLAY CARDS STACK
// =============================================================================

export function DisplayCards({
  cards,
  maxVisible = 3,
  autoRotateInterval = 4000,
  direction = 'up',
  className,
}: DisplayCardsProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [animationDirection, setAnimationDirection] = React.useState(1)
  const shouldReduceMotion = useReducedMotion()
  const reducedMotion = shouldReduceMotion ?? false

  // Auto-rotate cards
  React.useEffect(() => {
    if (autoRotateInterval <= 0 || cards.length <= 1) return

    const interval = setInterval(() => {
      setAnimationDirection(direction === 'up' ? 1 : -1)
      setCurrentIndex((prev) => (prev + 1) % cards.length)
    }, autoRotateInterval)

    return () => clearInterval(interval)
  }, [autoRotateInterval, cards.length, direction])

  // Get visible cards (starting from current index)
  const visibleCards = React.useMemo(() => {
    const result: (DisplayCard & { stackIndex: number })[] = []
    for (let i = 0; i < Math.min(maxVisible, cards.length); i++) {
      const cardIndex = (currentIndex + i) % cards.length
      result.push({ ...cards[cardIndex], stackIndex: i })
    }
    return result
  }, [cards, currentIndex, maxVisible])

  // Manual navigation
  const goToNext = () => {
    setAnimationDirection(1)
    setCurrentIndex((prev) => (prev + 1) % cards.length)
  }

  const goToPrev = () => {
    setAnimationDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)
  }

  return (
    <div 
      className={cn(
        'relative',
        // Fixed aspect ratio to prevent layout shift
        'aspect-[4/3] w-full max-w-md',
        className
      )}
      style={{ perspective: '1000px' }}
    >
      <AnimatePresence initial={false} custom={animationDirection}>
        {visibleCards.map((card, index) => (
          <SingleCard
            key={`${card.id}-${currentIndex}`}
            card={card}
            index={card.stackIndex}
            total={visibleCards.length}
            isTop={index === 0}
            reducedMotion={reducedMotion}
            direction={animationDirection}
          />
        ))}
      </AnimatePresence>

      {/* Navigation buttons (optional, hidden by default) */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
        <button
          onClick={goToPrev}
          className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Previous card"
        >
          ←
        </button>
        <button
          onClick={goToNext}
          className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Next card"
        >
          →
        </button>
      </div>
    </div>
  )
}

// =============================================================================
// STATIC STACKED CARDS (no animation, simpler)
// =============================================================================

export interface StaticDisplayCardsProps {
  cards: DisplayCard[]
  className?: string
}

export function StaticDisplayCards({ cards, className }: StaticDisplayCardsProps) {
  const visibleCards = cards.slice(0, 3)

  return (
    <div 
      className={cn(
        'relative',
        'aspect-[4/3] w-full max-w-md',
        className
      )}
    >
      {visibleCards.map((card, index) => (
        <div
          key={card.id}
          className={cn(
            'absolute inset-0',
            // Consistent radius
            'rounded-xl',
            'bg-[var(--glass-bg-elevated)] backdrop-blur-xl',
            'border border-[var(--glass-border)]',
            'shadow-[var(--shadow-lg-value)]',
            // Use CSS variable for transition
            'transition-transform duration-[var(--duration-normal)]',
            card.className
          )}
          style={{
            transform: `translateY(${index * -8}px) scale(${1 - index * 0.05})`,
            opacity: 1 - index * 0.15,
            zIndex: 10 - index,
          }}
        >
          {/* Accent gradient overlay */}
          {card.accentColor && (
            <div 
              className="absolute inset-0 rounded-xl opacity-10"
              style={{
                background: `linear-gradient(135deg, ${card.accentColor} 0%, transparent 60%)`,
              }}
            />
          )}
          
          <div className="relative z-10 p-6 h-full flex flex-col">
            {card.icon && (
              <div className="mb-4 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                {card.icon}
              </div>
            )}
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {card.title}
            </h3>
            {card.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
