'use client'

import { FileText, Pill, Shield, Clock, Star, Zap, Heart, Scale } from 'lucide-react'
import {
  DisplayCards,
  StaticDisplayCards,
  type DisplayCard,
} from '@/components/ui/display-cards'

// =============================================================================
// SAMPLE DATA
// =============================================================================

const serviceCards: DisplayCard[] = [
  {
    id: 'med-cert',
    title: 'Medical Certificate',
    description: 'Valid proof of illness for work, uni, or any official purpose.',
    icon: <FileText className="w-5 h-5" />,
    accentColor: 'oklch(0.65 0.15 185)',
  },
  {
    id: 'prescription',
    title: 'Prescription',
    description: 'Get your regular medications sent to any pharmacy.',
    icon: <Pill className="w-5 h-5" />,
    accentColor: 'oklch(0.6 0.15 280)',
  },
  {
    id: 'consultation',
    title: 'Consultation',
    description: 'Speak with a doctor about any health concern.',
    icon: <Heart className="w-5 h-5" />,
    accentColor: 'oklch(0.65 0.15 350)',
  },
]

const trustCards: DisplayCard[] = [
  {
    id: 'fast',
    title: '45 Min Average',
    description: 'Most requests reviewed within an hour.',
    icon: <Clock className="w-5 h-5" />,
    accentColor: 'oklch(0.65 0.15 185)',
  },
  {
    id: 'doctors',
    title: 'AHPRA Registered',
    description: 'All doctors are Australian-registered GPs.',
    icon: <Shield className="w-5 h-5" />,
    accentColor: 'oklch(0.6 0.15 280)',
  },
  {
    id: 'rating',
    title: '4.9/5 Rating',
    description: 'Based on 10,000+ patient reviews.',
    icon: <Star className="w-5 h-5" />,
    accentColor: 'oklch(0.7 0.15 80)',
  },
  {
    id: 'refund',
    title: 'Money Back',
    description: 'Full refund if we can\'t help.',
    icon: <Zap className="w-5 h-5" />,
    accentColor: 'oklch(0.65 0.15 140)',
  },
]

const featureCards: DisplayCard[] = [
  {
    id: 'no-wait',
    title: 'No Waiting Rooms',
    description: 'Skip the queue. Complete everything from your phone.',
    icon: <Clock className="w-5 h-5" />,
    accentColor: 'oklch(0.65 0.15 185)',
  },
  {
    id: 'secure',
    title: 'Bank-Level Security',
    description: 'Your health data is encrypted and protected.',
    icon: <Shield className="w-5 h-5" />,
    accentColor: 'oklch(0.6 0.15 280)',
  },
  {
    id: 'support',
    title: '7 Days a Week',
    description: 'Available when you need us, including weekends.',
    icon: <Heart className="w-5 h-5" />,
    accentColor: 'oklch(0.65 0.15 350)',
  },
]

// =============================================================================
// ANIMATED DISPLAY CARDS DEMO
// =============================================================================

export function AnimatedDisplayCardsDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Animated Card Stack</h2>
        <p className="text-muted-foreground mb-8">
          Auto-rotating cards with smooth 3D transitions
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 items-start">
        {/* Default rotation */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">Default (4s interval)</p>
          <div className="flex justify-center">
            <DisplayCards cards={serviceCards} />
          </div>
        </div>

        {/* Faster rotation */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">Fast (2s interval)</p>
          <div className="flex justify-center">
            <DisplayCards 
              cards={trustCards} 
              autoRotateInterval={2000}
            />
          </div>
        </div>

        {/* Slower rotation */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">Slow (6s interval)</p>
          <div className="flex justify-center">
            <DisplayCards 
              cards={featureCards}
              autoRotateInterval={6000}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// DIRECTION DEMO
// =============================================================================

export function DirectionDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Animation Direction</h2>
        <p className="text-muted-foreground mb-8">
          Cards can animate up or down through the stack
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Up direction */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">Direction: Up (default)</p>
          <div className="flex justify-center">
            <DisplayCards 
              cards={serviceCards}
              direction="up"
              autoRotateInterval={3000}
            />
          </div>
        </div>

        {/* Down direction */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">Direction: Down</p>
          <div className="flex justify-center">
            <DisplayCards 
              cards={serviceCards}
              direction="down"
              autoRotateInterval={3000}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// VISIBLE CARDS DEMO
// =============================================================================

export function VisibleCardsDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Visible Card Count</h2>
        <p className="text-muted-foreground mb-8">
          Control how many cards are visible in the stack
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        {/* 2 visible */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">2 Visible</p>
          <div className="flex justify-center">
            <DisplayCards 
              cards={trustCards}
              maxVisible={2}
              autoRotateInterval={3000}
            />
          </div>
        </div>

        {/* 3 visible (default) */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">3 Visible (default)</p>
          <div className="flex justify-center">
            <DisplayCards 
              cards={trustCards}
              maxVisible={3}
              autoRotateInterval={3000}
            />
          </div>
        </div>

        {/* 4 visible */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">4 Visible</p>
          <div className="flex justify-center">
            <DisplayCards 
              cards={trustCards}
              maxVisible={4}
              autoRotateInterval={3000}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// STATIC DISPLAY CARDS DEMO
// =============================================================================

export function StaticDisplayCardsDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Static Card Stack</h2>
        <p className="text-muted-foreground mb-8">
          Non-animated stacked cards for simpler use cases
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Services */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">Services</p>
          <div className="flex justify-center">
            <StaticDisplayCards cards={serviceCards} />
          </div>
        </div>

        {/* Features */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6">Features</p>
          <div className="flex justify-center">
            <StaticDisplayCards cards={featureCards} />
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// NO AUTO-ROTATE DEMO
// =============================================================================

export function ManualControlDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Manual Control</h2>
        <p className="text-muted-foreground mb-8">
          Disable auto-rotate and use manual navigation (hover to reveal controls)
        </p>
      </div>

      <div className="flex justify-center">
        <DisplayCards 
          cards={trustCards}
          autoRotateInterval={0}
        />
      </div>
    </div>
  )
}

// =============================================================================
// CUSTOM STYLING DEMO
// =============================================================================

export function CustomStylingDemo() {
  const customCards: DisplayCard[] = [
    {
      id: 'custom-1',
      title: 'Premium Feature',
      description: 'With custom accent color styling.',
      icon: <Star className="w-5 h-5" />,
      accentColor: '#F59E0B',
      className: 'bg-gradient-to-br from-amber-500/10 to-orange-500/5',
    },
    {
      id: 'custom-2',
      title: 'Special Offer',
      description: 'Limited time promotion.',
      icon: <Zap className="w-5 h-5" />,
      accentColor: '#EC4899',
      className: 'bg-gradient-to-br from-pink-500/10 to-rose-500/5',
    },
    {
      id: 'custom-3',
      title: 'New Service',
      description: 'Just launched this week.',
      icon: <Scale className="w-5 h-5" />,
      accentColor: '#8B5CF6',
      className: 'bg-gradient-to-br from-violet-500/10 to-purple-500/5',
    },
  ]

  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Custom Styling</h2>
        <p className="text-muted-foreground mb-8">
          Cards with custom colors and gradients
        </p>
      </div>

      <div className="flex justify-center">
        <DisplayCards 
          cards={customCards}
          autoRotateInterval={3500}
        />
      </div>
    </div>
  )
}

// =============================================================================
// COMBINED DEMO PAGE
// =============================================================================

export default function DisplayCardsDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="py-12 text-center border-b">
        <h1 className="text-4xl font-bold mb-4">Display Cards</h1>
        <p className="text-xl text-muted-foreground">
          Stacked card components with beautiful animations
        </p>
      </div>

      <AnimatedDisplayCardsDemo />
      
      <div className="border-t">
        <DirectionDemo />
      </div>
      
      <div className="border-t">
        <VisibleCardsDemo />
      </div>
      
      <div className="border-t">
        <StaticDisplayCardsDemo />
      </div>
      
      <div className="border-t">
        <ManualControlDemo />
      </div>
      
      <div className="border-t">
        <CustomStylingDemo />
      </div>
    </div>
  )
}
