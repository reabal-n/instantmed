'use client'

import { ArrowRight, Shield, Clock, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AnimatedHero,
  RotatingWords,
  GradientText,
  FloatingElement,
} from '@/components/ui/animated-hero'

// =============================================================================
// HERO DEMO - Basic Usage
// =============================================================================

export function HeroDemoBasic() {
  return (
    <AnimatedHero
      badge={
        <Badge variant="secondary" className="px-4 py-2">
          <Sparkles className="w-4 h-4 mr-2" />
          Now available nationwide
        </Badge>
      }
      title={
        <>
          Healthcare that's{' '}
          <GradientText>
            <RotatingWords
              words={['faster', 'smarter', 'easier', 'better']}
              interval={2500}
            />
          </GradientText>
        </>
      }
      subtitle="Get medical certificates and prescriptions from Australian doctors in under an hour. No appointments, no waiting rooms."
      primaryCta={
        <Button size="lg">
          Get started
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      }
      secondaryCta={
        <Button size="lg" variant="outline">
          How it works
        </Button>
      }
      trustIndicators={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="font-medium text-foreground">4.9/5</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-primary" />
            <span>AHPRA registered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            <span>~45 min response</span>
          </div>
        </div>
      }
      heroContent={
        <FloatingElement distance={15} duration={4}>
          <div className="w-80 h-60 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <span className="text-muted-foreground">Hero Image/Cards</span>
          </div>
        </FloatingElement>
      }
    />
  )
}

// =============================================================================
// HERO DEMO - Minimal
// =============================================================================

export function HeroDemoMinimal() {
  return (
    <AnimatedHero
      title={
        <>
          Feel better,{' '}
          <GradientText gradient="linear-gradient(135deg, #00E2B5 0%, #06B6D4 100%)">
            today
          </GradientText>
        </>
      }
      subtitle="Medical certificates and prescriptions delivered to your inbox."
      primaryCta={
        <Button size="lg">
          Start now
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      }
    />
  )
}

// =============================================================================
// ROTATING WORDS DEMO
// =============================================================================

export function RotatingWordsDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Rotating Words Component</h2>
        <p className="text-muted-foreground mb-8">
          Smooth word transitions with spring animations
        </p>
      </div>

      <div className="space-y-6">
        {/* Default usage */}
        <div className="p-6 rounded-xl border bg-card">
          <p className="text-sm text-muted-foreground mb-2">Default (3s interval)</p>
          <p className="text-2xl font-semibold">
            We make healthcare{' '}
            <span className="text-primary">
              <RotatingWords
                words={['simple', 'fast', 'affordable', 'accessible']}
              />
            </span>
          </p>
        </div>

        {/* Fast rotation */}
        <div className="p-6 rounded-xl border bg-card">
          <p className="text-sm text-muted-foreground mb-2">Fast (1.5s interval)</p>
          <p className="text-2xl font-semibold">
            Get your{' '}
            <GradientText>
              <RotatingWords
                words={['med cert', 'prescription', 'results']}
                interval={1500}
              />
            </GradientText>{' '}
            now
          </p>
        </div>

        {/* Slow rotation */}
        <div className="p-6 rounded-xl border bg-card">
          <p className="text-sm text-muted-foreground mb-2">Slow (5s interval)</p>
          <p className="text-2xl font-semibold">
            Trusted by{' '}
            <span className="text-emerald-500">
              <RotatingWords
                words={['10,000+ patients', 'leading employers', 'universities']}
                interval={5000}
              />
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// GRADIENT TEXT DEMO
// =============================================================================

export function GradientTextDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Gradient Text Component</h2>
        <p className="text-muted-foreground mb-8">
          Beautiful gradient text effects
        </p>
      </div>

      <div className="space-y-6">
        {/* Primary gradient */}
        <div className="p-6 rounded-xl border bg-card text-center">
          <p className="text-sm text-muted-foreground mb-2">Primary (default)</p>
          <p className="text-4xl font-bold">
            <GradientText>Healthcare reimagined</GradientText>
          </p>
        </div>

        {/* Teal to cyan */}
        <div className="p-6 rounded-xl border bg-card text-center">
          <p className="text-sm text-muted-foreground mb-2">Teal to Cyan</p>
          <p className="text-4xl font-bold">
            <GradientText gradient="linear-gradient(135deg, #00E2B5 0%, #06B6D4 100%)">
              Instant results
            </GradientText>
          </p>
        </div>

        {/* Purple to pink */}
        <div className="p-6 rounded-xl border bg-card text-center">
          <p className="text-sm text-muted-foreground mb-2">Purple to Pink</p>
          <p className="text-4xl font-bold">
            <GradientText gradient="linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)">
              Premium care
            </GradientText>
          </p>
        </div>

        {/* Three color gradient */}
        <div className="p-6 rounded-xl border bg-card text-center">
          <p className="text-sm text-muted-foreground mb-2">Multi-color</p>
          <p className="text-4xl font-bold">
            <GradientText gradient="linear-gradient(135deg, #00E2B5 0%, #06B6D4 50%, #8B5CF6 100%)">
              The future of telehealth
            </GradientText>
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// FLOATING ELEMENT DEMO
// =============================================================================

export function FloatingElementDemo() {
  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Floating Element Component</h2>
        <p className="text-muted-foreground mb-8">
          Subtle floating animations for visual interest
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {/* Default float */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Default</p>
          <FloatingElement>
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </FloatingElement>
        </div>

        {/* Larger float */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Large (20px)</p>
          <FloatingElement distance={20} duration={4}>
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/5 border border-emerald-500/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-emerald-500" />
            </div>
          </FloatingElement>
        </div>

        {/* Delayed float */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Delayed (1s)</p>
          <FloatingElement distance={15} duration={3} delay={1}>
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/5 border border-violet-500/20 flex items-center justify-center">
              <Star className="w-8 h-8 text-violet-500" />
            </div>
          </FloatingElement>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// COMBINED DEMO PAGE
// =============================================================================

export default function HeroDemo() {
  return (
    <div className="min-h-screen bg-background">
      {/* Full hero demo */}
      <HeroDemoBasic />

      {/* Component demos */}
      <div className="border-t">
        <RotatingWordsDemo />
      </div>

      <div className="border-t">
        <GradientTextDemo />
      </div>

      <div className="border-t">
        <FloatingElementDemo />
      </div>

      {/* Minimal hero demo */}
      <div className="border-t">
        <div className="p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Minimal Hero Variant</h2>
          <p className="text-muted-foreground mb-8">
            A simpler hero without all the bells and whistles
          </p>
        </div>
        <HeroDemoMinimal />
      </div>
    </div>
  )
}
