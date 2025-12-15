'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  fadeIn,
  fadeUp,
  fadeInBlur,
  pageIn,
  scaleIn,
  slideLeft,
  slideRight,
  popIn,
  stagger,
  hoverLift,
  hoverScale,
  hoverLiftGlow,
  glowHover,
  press,
  pressDeep,
  duration,
  easing,
  spring,
  reduced,
  prefersReducedMotion,
} from '@/lib/motion'
import { MotionProvider, useMotion } from '@/components/motion'
import { RefreshCw, Play, Pause, Zap, Info } from 'lucide-react'

// =============================================================================
// DEMO CARD COMPONENT
// =============================================================================

interface DemoCardProps {
  title: string
  description: string
  children: React.ReactNode
  className?: string
  code?: string
}

function DemoCard({ title, description, children, className, code }: DemoCardProps) {
  const [showCode, setShowCode] = useState(false)
  
  return (
    <div className={cn(
      'glass-card p-6 space-y-4',
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        </div>
        {code && (
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            {showCode ? 'Hide' : 'Code'}
          </button>
        )}
      </div>
      
      <div className="min-h-[120px] flex items-center justify-center bg-surface-inset rounded-lg p-4">
        {children}
      </div>
      
      {showCode && code && (
        <pre className="text-xs bg-surface-inset rounded-lg p-3 overflow-x-auto text-text-secondary">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}

// =============================================================================
// ANIMATED DEMO BOX
// =============================================================================

function DemoBox({ className }: { className?: string }) {
  return (
    <div className={cn(
      'w-16 h-16 rounded-lg bg-primary/20 border border-primary/30',
      'flex items-center justify-center text-primary font-medium',
      className
    )}>
      <Zap className="w-6 h-6" />
    </div>
  )
}

// =============================================================================
// VARIANT DEMOS
// =============================================================================

function FadeInDemo() {
  const [key, setKey] = useState(0)
  
  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={fadeIn}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <DemoBox />
        </motion.div>
      </AnimatePresence>
      <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
        <RefreshCw className="w-3 h-3 mr-2" />
        Replay
      </Button>
    </div>
  )
}

function FadeUpDemo() {
  const [key, setKey] = useState(0)
  
  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={fadeUp}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <DemoBox />
        </motion.div>
      </AnimatePresence>
      <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
        <RefreshCw className="w-3 h-3 mr-2" />
        Replay
      </Button>
    </div>
  )
}

function PageInDemo() {
  const [key, setKey] = useState(0)
  
  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={pageIn}
          initial="initial"
          animate="animate"
          exit="exit"
          className="text-center"
        >
          <div className="text-2xl font-bold text-text-primary mb-2">Page Title</div>
          <div className="text-sm text-text-secondary">Content fades in with slide</div>
        </motion.div>
      </AnimatePresence>
      <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
        <RefreshCw className="w-3 h-3 mr-2" />
        Replay
      </Button>
    </div>
  )
}

function FadeBlurDemo() {
  const [key, setKey] = useState(0)
  
  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={fadeInBlur}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <DemoBox />
        </motion.div>
      </AnimatePresence>
      <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
        <RefreshCw className="w-3 h-3 mr-2" />
        Replay
      </Button>
    </div>
  )
}

function ScaleInDemo() {
  const [key, setKey] = useState(0)
  
  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={scaleIn}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <DemoBox />
        </motion.div>
      </AnimatePresence>
      <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
        <RefreshCw className="w-3 h-3 mr-2" />
        Replay
      </Button>
    </div>
  )
}

function PopInDemo() {
  const [key, setKey] = useState(0)
  
  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={popIn}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <DemoBox />
        </motion.div>
      </AnimatePresence>
      <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
        <RefreshCw className="w-3 h-3 mr-2" />
        Replay
      </Button>
    </div>
  )
}

function StaggerDemo() {
  const [key, setKey] = useState(0)
  
  return (
    <div className="flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          variants={stagger.container}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex gap-2"
        >
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              variants={stagger.item}
              className="w-10 h-10 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-sm font-medium"
            >
              {i}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
        <RefreshCw className="w-3 h-3 mr-2" />
        Replay
      </Button>
    </div>
  )
}

function HoverLiftDemo() {
  return (
    <motion.div
      {...hoverLift}
      className="w-24 h-24 rounded-xl bg-surface border border-border flex items-center justify-center cursor-pointer shadow-premium"
    >
      <span className="text-sm text-text-secondary">Hover me</span>
    </motion.div>
  )
}

function HoverScaleDemo() {
  return (
    <motion.div
      {...hoverScale}
      className="w-24 h-24 rounded-xl bg-surface border border-border flex items-center justify-center cursor-pointer shadow-premium"
    >
      <span className="text-sm text-text-secondary">Hover me</span>
    </motion.div>
  )
}

function GlowHoverDemo() {
  return (
    <motion.div
      {...glowHover}
      className="w-24 h-24 rounded-xl bg-surface border border-border flex items-center justify-center cursor-pointer"
    >
      <span className="text-sm text-text-secondary">Hover me</span>
    </motion.div>
  )
}

function HoverLiftGlowDemo() {
  return (
    <motion.div
      {...hoverLiftGlow}
      className="w-24 h-24 rounded-xl bg-surface border border-border flex items-center justify-center cursor-pointer"
    >
      <span className="text-sm text-text-secondary">Hover me</span>
    </motion.div>
  )
}

function PressDemo() {
  return (
    <motion.button
      {...press}
      className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium shadow-premium"
    >
      Press me
    </motion.button>
  )
}

function PressDeepDemo() {
  return (
    <motion.button
      {...pressDeep}
      className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium shadow-premium"
    >
      Press deep
    </motion.button>
  )
}

function CombinedDemo() {
  return (
    <motion.button
      {...hoverLift}
      className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium shadow-premium"
    >
      Hover + Press
    </motion.button>
  )
}

// =============================================================================
// TIMING & EASING VISUALIZATION
// =============================================================================

function TimingDemo() {
  const [playing, setPlaying] = useState(false)
  const [key, setKey] = useState(0)

  const handlePlay = () => {
    setKey(k => k + 1)
    setPlaying(true)
    setTimeout(() => setPlaying(false), 1000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Button size="sm" onClick={handlePlay} disabled={playing}>
          {playing ? <Pause className="w-3 h-3 mr-2" /> : <Play className="w-3 h-3 mr-2" />}
          {playing ? 'Playing' : 'Play'}
        </Button>
      </div>
      
      <div className="space-y-3">
        {Object.entries(duration).map(([name, value]) => (
          <div key={`${name}-${key}`} className="flex items-center gap-4">
            <div className="w-20 text-xs text-text-muted">{name} ({value}s)</div>
            <div className="flex-1 h-2 bg-surface-inset rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: value, ease: 'linear' }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EasingDemo() {
  const [key, setKey] = useState(0)

  return (
    <div className="space-y-4">
      <Button size="sm" variant="outline" onClick={() => setKey(k => k + 1)}>
        <RefreshCw className="w-3 h-3 mr-2" />
        Replay
      </Button>
      
      <div className="space-y-3">
        {Object.entries(easing).filter(([k]) => k !== 'css').map(([name, value]) => (
          <div key={`${name}-${key}`} className="flex items-center gap-4">
            <div className="w-20 text-xs text-text-muted">{name}</div>
            <div className="flex-1 h-8 bg-surface-inset rounded-lg relative overflow-hidden">
              <motion.div
                initial={{ x: 0 }}
                animate={{ x: 'calc(100% - 24px)' }}
                transition={{ duration: 1, ease: value as number[] }}
                className="absolute left-0 top-1 w-6 h-6 bg-primary rounded-md"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// REDUCED MOTION STATUS
// =============================================================================

function ReducedMotionStatus() {
  const { reducedMotion } = useMotion()
  const systemPref = typeof window !== 'undefined' ? prefersReducedMotion() : false

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <Info className="w-5 h-5 text-primary" />
        <div>
          <div className="text-sm font-medium text-text-primary">
            Reduced Motion: {reducedMotion ? 'Enabled' : 'Disabled'}
          </div>
          <div className="text-xs text-text-muted">
            System preference: {systemPref ? 'reduce' : 'no-preference'}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function MotionDemoContent() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          variants={pageIn}
          initial="initial"
          animate="animate"
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Motion System
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl">
            Reusable Framer Motion variants for consistent animations across InstantMed.
            All variants support reduced-motion preferences.
          </p>
          
          <div className="mt-6">
            <ReducedMotionStatus />
          </div>
        </motion.div>

        {/* Entrance Animations */}
        <motion.section
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="mb-16"
        >
          <motion.h2 variants={stagger.item} className="text-2xl font-semibold text-text-primary mb-6">
            Entrance Animations
          </motion.h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div variants={stagger.item}>
              <DemoCard
                title="fadeIn"
                description="Simple opacity fade"
                code={`<motion.div variants={fadeIn} initial="initial" animate="animate" />`}
              >
                <FadeInDemo />
              </DemoCard>
            </motion.div>

            <motion.div variants={stagger.item}>
              <DemoCard
                title="fadeUp"
                description="Fade + slide up (most common)"
                code={`<motion.div variants={fadeUp} initial="initial" animate="animate" />`}
              >
                <FadeUpDemo />
              </DemoCard>
            </motion.div>

            <motion.div variants={stagger.item}>
              <DemoCard
                title="pageIn"
                description="Page-level entrance"
                code={`<motion.div variants={pageIn} initial="initial" animate="animate" />`}
              >
                <PageInDemo />
              </DemoCard>
            </motion.div>

            <motion.div variants={stagger.item}>
              <DemoCard
                title="fadeInBlur"
                description="Premium blur reveal"
                code={`<motion.div variants={fadeInBlur} initial="initial" animate="animate" />`}
              >
                <FadeBlurDemo />
              </DemoCard>
            </motion.div>

            <motion.div variants={stagger.item}>
              <DemoCard
                title="scaleIn"
                description="Scale + fade entrance"
                code={`<motion.div variants={scaleIn} initial="initial" animate="animate" />`}
              >
                <ScaleInDemo />
              </DemoCard>
            </motion.div>

            <motion.div variants={stagger.item}>
              <DemoCard
                title="popIn"
                description="Bouncy pop (celebratory)"
                code={`<motion.div variants={popIn} initial="initial" animate="animate" />`}
              >
                <PopInDemo />
              </DemoCard>
            </motion.div>
          </div>
        </motion.section>

        {/* Stagger */}
        <motion.section
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-semibold text-text-primary mb-6">
            Stagger Animation
          </h2>
          
          <DemoCard
            title="stagger"
            description="Container + item pattern for lists"
            code={`<motion.div variants={stagger.container}>
  {items.map(item => (
    <motion.div key={item} variants={stagger.item} />
  ))}
</motion.div>`}
          >
            <StaggerDemo />
          </DemoCard>
        </motion.section>

        {/* Hover Animations */}
        <motion.section
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-semibold text-text-primary mb-6">
            Hover Animations
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DemoCard
              title="hoverLift"
              description="Lift up on hover"
              code={`<motion.div {...hoverLift} />`}
            >
              <HoverLiftDemo />
            </DemoCard>

            <DemoCard
              title="hoverScale"
              description="Scale up on hover"
              code={`<motion.div {...hoverScale} />`}
            >
              <HoverScaleDemo />
            </DemoCard>

            <DemoCard
              title="glowHover"
              description="Glow effect on hover"
              code={`<motion.div {...glowHover} />`}
            >
              <GlowHoverDemo />
            </DemoCard>

            <DemoCard
              title="hoverLiftGlow"
              description="Combined lift + glow"
              code={`<motion.div {...hoverLiftGlow} />`}
            >
              <HoverLiftGlowDemo />
            </DemoCard>
          </div>
        </motion.section>

        {/* Press Animations */}
        <motion.section
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-semibold text-text-primary mb-6">
            Press Animations
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <DemoCard
              title="press"
              description="Subtle scale on tap"
              code={`<motion.button {...press} />`}
            >
              <PressDemo />
            </DemoCard>

            <DemoCard
              title="pressDeep"
              description="Deeper scale for larger buttons"
              code={`<motion.button {...pressDeep} />`}
            >
              <PressDeepDemo />
            </DemoCard>

            <DemoCard
              title="Combined"
              description="hoverLift includes tap"
              code={`<motion.button {...hoverLift} />`}
            >
              <CombinedDemo />
            </DemoCard>
          </div>
        </motion.section>

        {/* Timing & Easing */}
        <motion.section
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-2xl font-semibold text-text-primary mb-6">
            Timing & Easing
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <DemoCard
              title="Duration Scale"
              description="Global timing constants"
            >
              <TimingDemo />
            </DemoCard>

            <DemoCard
              title="Easing Curves"
              description="Global easing presets"
            >
              <EasingDemo />
            </DemoCard>
          </div>
        </motion.section>

        {/* Usage Reference */}
        <motion.section
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-semibold text-text-primary mb-6">
            Usage Reference
          </h2>
          
          <div className="glass-card p-6">
            <pre className="text-sm text-text-secondary overflow-x-auto">
              <code>{`// Import from @/lib/motion
import {
  // Entrance variants
  fadeIn,
  fadeUp,
  pageIn,
  fadeInBlur,
  scaleIn,
  popIn,
  slideLeft,
  slideRight,
  
  // Stagger system
  stagger,  // { container, containerFast, containerSlow, item, itemFade, itemScale }
  
  // Hover effects (spread these)
  hoverLift,
  hoverScale,
  glowHover,
  hoverLiftGlow,
  
  // Press effects
  press,
  pressDeep,
  
  // Timing
  duration,  // { instant, fast, normal, slow, slower, page }
  easing,    // { default, in, out, inOut, bounce, spring }
  spring,    // { snappy, smooth, bouncy, gentle }
  
  // Reduced motion
  reduced,   // { fadeIn, hover, tap }
  prefersReducedMotion,
} from '@/lib/motion'

// Use MotionProvider for global config
import { MotionProvider, useMotion } from '@/components/motion'`}</code>
            </pre>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default function MotionDemoPage() {
  return (
    <MotionProvider>
      <MotionDemoContent />
    </MotionProvider>
  )
}
