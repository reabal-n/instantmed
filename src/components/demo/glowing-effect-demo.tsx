'use client'

import { FileText, Pill, Shield, Zap, Star, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  GlowingEffect,
  GlowingBorder,
  Spotlight,
  PulseGlow,
  Shimmer,
  GlowCard,
} from '@/components/ui/glowing-effect'

// =============================================================================
// GLOWING EFFECT DEMO - Mouse Tracking
// =============================================================================

export function GlowingEffectDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Mouse-Tracking Glow</h2>
        <p className="text-muted-foreground mb-8">
          Glow follows your cursor with smooth spring physics
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Default glow */}
        <GlowingEffect
          glowColor="oklch(0.65 0.15 185)"
          intensity={0.4}
          radius={200}
          className="rounded-2xl"
        >
          <div className="p-8 rounded-2xl border bg-card h-64 flex flex-col items-center justify-center">
            <Shield className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Default Glow</h3>
            <p className="text-muted-foreground text-center text-sm">
              Move your mouse over this card
            </p>
          </div>
        </GlowingEffect>

        {/* Purple glow */}
        <GlowingEffect
          glowColor="oklch(0.6 0.2 280)"
          intensity={0.5}
          radius={250}
          className="rounded-2xl"
        >
          <div className="p-8 rounded-2xl border bg-card h-64 flex flex-col items-center justify-center">
            <Zap className="w-12 h-12 text-violet-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Purple Glow</h3>
            <p className="text-muted-foreground text-center text-sm">
              Custom color and larger radius
            </p>
          </div>
        </GlowingEffect>

        {/* Warm glow */}
        <GlowingEffect
          glowColor="oklch(0.7 0.15 50)"
          intensity={0.4}
          radius={180}
          blur={60}
          className="rounded-2xl"
        >
          <div className="p-8 rounded-2xl border bg-card h-64 flex flex-col items-center justify-center">
            <Star className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Warm Glow</h3>
            <p className="text-muted-foreground text-center text-sm">
              Amber color with less blur
            </p>
          </div>
        </GlowingEffect>

        {/* High intensity */}
        <GlowingEffect
          glowColor="oklch(0.65 0.2 185)"
          intensity={0.7}
          radius={300}
          className="rounded-2xl"
        >
          <div className="p-8 rounded-2xl border bg-card h-64 flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 text-emerald-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">High Intensity</h3>
            <p className="text-muted-foreground text-center text-sm">
              Stronger glow effect
            </p>
          </div>
        </GlowingEffect>
      </div>
    </div>
  )
}

// =============================================================================
// GLOWING BORDER DEMO
// =============================================================================

export function GlowingBorderDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Animated Glowing Borders</h2>
        <p className="text-muted-foreground mb-8">
          Gradient borders that animate around the element
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Default border */}
        <GlowingBorder>
          <div className="p-6 h-48 flex flex-col items-center justify-center">
            <Shield className="w-10 h-10 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Default</h3>
            <p className="text-sm text-muted-foreground text-center">
              Teal to purple gradient
            </p>
          </div>
        </GlowingBorder>

        {/* Custom colors */}
        <GlowingBorder
          colors={['#F59E0B', '#EC4899', '#F59E0B']}
          duration={4}
        >
          <div className="p-6 h-48 flex flex-col items-center justify-center">
            <Star className="w-10 h-10 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-1">Warm Colors</h3>
            <p className="text-sm text-muted-foreground text-center">
              Amber to pink gradient
            </p>
          </div>
        </GlowingBorder>

        {/* Fast animation */}
        <GlowingBorder
          colors={['#06B6D4', '#8B5CF6', '#06B6D4']}
          duration={2}
          borderWidth={3}
        >
          <div className="p-6 h-48 flex flex-col items-center justify-center">
            <Zap className="w-10 h-10 text-cyan-500 mb-3" />
            <h3 className="font-semibold mb-1">Fast & Thick</h3>
            <p className="text-sm text-muted-foreground text-center">
              Faster animation, thicker border
            </p>
          </div>
        </GlowingBorder>
      </div>
    </div>
  )
}

// =============================================================================
// SPOTLIGHT DEMO
// =============================================================================

export function SpotlightDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Spotlight Effect</h2>
        <p className="text-muted-foreground mb-8">
          Reveals a spotlight under the cursor on hover
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Default spotlight */}
        <Spotlight className="rounded-2xl">
          <div className="p-8 rounded-2xl border bg-card/50 h-64 flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Default Spotlight</h3>
            <p className="text-muted-foreground text-center text-sm">
              Hover to reveal the spotlight
            </p>
          </div>
        </Spotlight>

        {/* Custom spotlight */}
        <Spotlight
          color="oklch(0.6 0.2 280 / 0.2)"
          size={400}
          className="rounded-2xl"
        >
          <div className="p-8 rounded-2xl border bg-card/50 h-64 flex flex-col items-center justify-center">
            <Pill className="w-12 h-12 text-violet-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Purple Spotlight</h3>
            <p className="text-muted-foreground text-center text-sm">
              Larger size, purple color
            </p>
          </div>
        </Spotlight>
      </div>
    </div>
  )
}

// =============================================================================
// PULSE GLOW DEMO
// =============================================================================

export function PulseGlowDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Pulse Glow Effect</h2>
        <p className="text-muted-foreground mb-8">
          Continuous pulsing glow animation
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {/* Default pulse */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Default</p>
          <PulseGlow>
            <Button size="lg" className="rounded-full">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </PulseGlow>
        </div>

        {/* Purple pulse */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Purple</p>
          <PulseGlow color="oklch(0.6 0.2 280)" duration={2.5}>
            <Button size="lg" variant="secondary" className="rounded-full">
              Learn More
            </Button>
          </PulseGlow>
        </div>

        {/* Fast pulse */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Fast Pulse</p>
          <PulseGlow color="oklch(0.7 0.15 50)" duration={1} scale={1.1}>
            <Button size="lg" variant="outline" className="rounded-full">
              Urgent Action
            </Button>
          </PulseGlow>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// SHIMMER DEMO
// =============================================================================

export function ShimmerDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Shimmer Effect</h2>
        <p className="text-muted-foreground mb-8">
          Loading shimmer animation across elements
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Button shimmer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Button</p>
          <Shimmer className="inline-block rounded-full">
            <Button size="lg" className="rounded-full">
              Processing...
            </Button>
          </Shimmer>
        </div>

        {/* Card shimmer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Card</p>
          <Shimmer className="rounded-xl">
            <div className="p-6 rounded-xl border bg-card">
              <div className="h-4 w-3/4 bg-muted rounded mb-3" />
              <div className="h-3 w-full bg-muted rounded mb-2" />
              <div className="h-3 w-2/3 bg-muted rounded" />
            </div>
          </Shimmer>
        </div>

        {/* Badge shimmer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Badge</p>
          <Shimmer className="inline-block rounded-full" duration={1.5}>
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
              <Zap className="w-4 h-4 mr-2" />
              New Feature
            </span>
          </Shimmer>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// GLOW CARD DEMO
// =============================================================================

export function GlowCardDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Glow Cards</h2>
        <p className="text-muted-foreground mb-8">
          Cards with subtle glow effects on hover
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Default glow card */}
        <GlowCard className="p-6">
          <FileText className="w-10 h-10 text-primary mb-4" />
          <h3 className="font-semibold mb-2">Medical Certificates</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get valid sick leave certificates delivered to your inbox.
          </p>
          <p className="text-sm font-medium text-primary">From $24.95</p>
        </GlowCard>

        {/* Purple glow card */}
        <GlowCard glowColor="oklch(0.6 0.2 280)" className="p-6">
          <Pill className="w-10 h-10 text-violet-500 mb-4" />
          <h3 className="font-semibold mb-2">Prescriptions</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Renew your regular medications without the wait.
          </p>
          <p className="text-sm font-medium text-violet-500">From $19.95</p>
        </GlowCard>

        {/* Always visible glow */}
        <GlowCard 
          glowColor="oklch(0.65 0.15 185)"
          hoverOnly={false}
          className="p-6"
        >
          <Star className="w-10 h-10 text-amber-500 mb-4" />
          <h3 className="font-semibold mb-2">Premium</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Priority review and 30-minute response time.
          </p>
          <p className="text-sm font-medium text-amber-500">Always Glowing</p>
        </GlowCard>
      </div>
    </div>
  )
}

// =============================================================================
// COMBINED DEMO PAGE
// =============================================================================

export default function GlowingEffectDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="py-12 text-center border-b">
        <h1 className="text-4xl font-bold mb-4">Glowing Effects</h1>
        <p className="text-xl text-muted-foreground">
          A collection of beautiful glow and light effects
        </p>
      </div>

      <GlowingEffectDemo />
      
      <div className="border-t">
        <GlowingBorderDemo />
      </div>
      
      <div className="border-t">
        <SpotlightDemo />
      </div>
      
      <div className="border-t">
        <PulseGlowDemo />
      </div>
      
      <div className="border-t">
        <ShimmerDemo />
      </div>
      
      <div className="border-t">
        <GlowCardDemo />
      </div>
    </div>
  )
}
