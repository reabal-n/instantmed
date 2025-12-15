'use client'

import { motion } from 'framer-motion'
import {
  Zap,
  Shield,
  Heart,
  Star,
  Bell,
  Check,
  AlertTriangle,
  Info,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardMotion,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
} from '@/components/ui/glass-card'
import { IconBadge, IconBadgeMotion } from '@/components/ui/icon-badge'
import {
  Section,
  SectionMotion,
  SectionHeader,
  SectionHeaderMotion,
} from '@/components/ui/section'
import {
  GradientBg,
  GradientBgMotion,
  GradientContainer,
} from '@/components/ui/gradient-bg'
import { Divider, DividerMotion } from '@/components/ui/divider'
import { pageIn, stagger, fadeUp } from '@/lib/motion'
import { cn } from '@/lib/utils'

// =============================================================================
// DEMO SECTION WRAPPER
// =============================================================================

function DemoSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  )
}

function DemoGrid({
  children,
  cols = 3,
}: {
  children: React.ReactNode
  cols?: 2 | 3 | 4
}) {
  return (
    <div
      className={cn(
        'grid gap-6',
        cols === 2 && 'md:grid-cols-2',
        cols === 3 && 'md:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'md:grid-cols-2 lg:grid-cols-4'
      )}
    >
      {children}
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="text-xs bg-surface-inset rounded-lg p-3 overflow-x-auto text-muted-foreground mt-4">
      <code>{children}</code>
    </pre>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function PrimitivesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero with gradient */}
      <div className="relative">
        <GradientBgMotion variant="hero" blur="lg" />
        <Section spacing="lg" container="default">
          <motion.div
            variants={pageIn}
            initial="initial"
            animate="animate"
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              UI Primitives
            </h1>
            <p className="text-lg text-muted-foreground">
              Reusable components with glassmorphism, motion, and premium styling.
              All components follow shadcn conventions.
            </p>
          </motion.div>
        </Section>
      </div>

      <Section spacing="lg" container="default">
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="space-y-24"
        >
          {/* ----------------------------------------------------------------
              GLASS CARD
              ---------------------------------------------------------------- */}
          <motion.div variants={stagger.item}>
            <DemoSection title="GlassCard">
              <p className="text-muted-foreground mb-6">
                Glassmorphism cards with blur, borders, and hover effects.
                Use <code className="text-primary">GlassCardMotion</code> for animated version.
              </p>

              <DemoGrid cols={3}>
                {/* Default */}
                <GlassCardMotion hover="lift">
                  <GlassCardHeader>
                    <GlassCardTitle>Default</GlassCardTitle>
                    <GlassCardDescription>
                      Standard glass card with lift hover
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <p className="text-sm text-muted-foreground">
                      Uses backdrop-blur and semi-transparent background.
                    </p>
                  </GlassCardContent>
                </GlassCardMotion>

                {/* Elevated */}
                <GlassCardMotion variant="elevated" hover="glow">
                  <GlassCardHeader>
                    <GlassCardTitle>Elevated + Glow</GlassCardTitle>
                    <GlassCardDescription>
                      More prominent with glow on hover
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <p className="text-sm text-muted-foreground">
                      Perfect for featured content or CTAs.
                    </p>
                  </GlassCardContent>
                </GlassCardMotion>

                {/* Subtle */}
                <GlassCardMotion variant="subtle" hover="scale">
                  <GlassCardHeader>
                    <GlassCardTitle>Subtle + Scale</GlassCardTitle>
                    <GlassCardDescription>
                      Minimal styling with scale hover
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <p className="text-sm text-muted-foreground">
                      Good for secondary content or lists.
                    </p>
                  </GlassCardContent>
                </GlassCardMotion>

                {/* Solid */}
                <GlassCard variant="solid" size="lg">
                  <GlassCardHeader>
                    <GlassCardTitle>Solid (Static)</GlassCardTitle>
                    <GlassCardDescription>
                      No blur, solid background
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <p className="text-sm text-muted-foreground">
                      Use GlassCard (not Motion) for static cards.
                    </p>
                  </GlassCardContent>
                </GlassCard>

                {/* With Footer */}
                <GlassCardMotion hover="lift" className="col-span-1 md:col-span-2">
                  <GlassCardHeader>
                    <GlassCardTitle>With Footer</GlassCardTitle>
                    <GlassCardDescription>
                      Full card structure with header, content, footer
                    </GlassCardDescription>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <p className="text-sm text-muted-foreground">
                      Use GlassCardHeader, GlassCardContent, GlassCardFooter for consistent spacing.
                    </p>
                  </GlassCardContent>
                  <GlassCardFooter className="justify-end gap-2">
                    <Button variant="ghost" size="sm">
                      Cancel
                    </Button>
                    <Button size="sm">
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </GlassCardFooter>
                </GlassCardMotion>
              </DemoGrid>

              <CodeBlock>{`import { GlassCardMotion, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card'

<GlassCardMotion variant="default" hover="lift">
  <GlassCardHeader>
    <GlassCardTitle>Title</GlassCardTitle>
  </GlassCardHeader>
</GlassCardMotion>`}</CodeBlock>
            </DemoSection>
          </motion.div>

          <Divider variant="fade" />

          {/* ----------------------------------------------------------------
              ICON BADGE
              ---------------------------------------------------------------- */}
          <motion.div variants={stagger.item}>
            <DemoSection title="IconBadge">
              <p className="text-muted-foreground mb-6">
                Small rounded containers for icons. Multiple variants and sizes.
              </p>

              {/* Variants */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Variants
                </h3>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="text-center space-y-2">
                    <IconBadgeMotion variant="default">
                      <Zap />
                    </IconBadgeMotion>
                    <p className="text-xs text-muted-foreground">default</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadgeMotion variant="secondary">
                      <Shield />
                    </IconBadgeMotion>
                    <p className="text-xs text-muted-foreground">secondary</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadgeMotion variant="muted">
                      <Heart />
                    </IconBadgeMotion>
                    <p className="text-xs text-muted-foreground">muted</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadgeMotion variant="glass">
                      <Star />
                    </IconBadgeMotion>
                    <p className="text-xs text-muted-foreground">glass</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadgeMotion variant="success">
                      <Check />
                    </IconBadgeMotion>
                    <p className="text-xs text-muted-foreground">success</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadgeMotion variant="warning">
                      <AlertTriangle />
                    </IconBadgeMotion>
                    <p className="text-xs text-muted-foreground">warning</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadgeMotion variant="destructive">
                      <Bell />
                    </IconBadgeMotion>
                    <p className="text-xs text-muted-foreground">destructive</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadgeMotion variant="gradient">
                      <Sparkles />
                    </IconBadgeMotion>
                    <p className="text-xs text-muted-foreground">gradient</p>
                  </div>
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-4 mt-8">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Sizes
                </h3>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="text-center space-y-2">
                    <IconBadge size="xs">
                      <Zap />
                    </IconBadge>
                    <p className="text-xs text-muted-foreground">xs</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadge size="sm">
                      <Zap />
                    </IconBadge>
                    <p className="text-xs text-muted-foreground">sm</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadge size="default">
                      <Zap />
                    </IconBadge>
                    <p className="text-xs text-muted-foreground">default</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadge size="lg">
                      <Zap />
                    </IconBadge>
                    <p className="text-xs text-muted-foreground">lg</p>
                  </div>
                  <div className="text-center space-y-2">
                    <IconBadge size="xl">
                      <Zap />
                    </IconBadge>
                    <p className="text-xs text-muted-foreground">xl</p>
                  </div>
                </div>
              </div>

              {/* With Glow */}
              <div className="space-y-4 mt-8">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  With Glow
                </h3>
                <div className="flex flex-wrap gap-4">
                  <IconBadge variant="default" glow>
                    <Zap />
                  </IconBadge>
                  <IconBadge variant="success" glow>
                    <Check />
                  </IconBadge>
                  <IconBadge variant="warning" glow>
                    <AlertTriangle />
                  </IconBadge>
                  <IconBadge variant="destructive" glow>
                    <Bell />
                  </IconBadge>
                </div>
              </div>

              <CodeBlock>{`import { IconBadge, IconBadgeMotion } from '@/components/ui/icon-badge'

<IconBadge variant="default" size="lg" glow>
  <Zap />
</IconBadge>

<IconBadgeMotion variant="success">
  <Check />
</IconBadgeMotion>`}</CodeBlock>
            </DemoSection>
          </motion.div>

          <Divider variant="fade" />

          {/* ----------------------------------------------------------------
              SECTION
              ---------------------------------------------------------------- */}
          <motion.div variants={stagger.item}>
            <DemoSection title="Section">
              <p className="text-muted-foreground mb-6">
                Consistent section spacing with optional headers. Use{' '}
                <code className="text-primary">SectionMotion</code> for animated entrance.
              </p>

              {/* Example sections */}
              <div className="space-y-8 -mx-4 md:-mx-6 lg:-mx-8">
                <Section spacing="default" background="inset">
                  <SectionHeader
                    subtitle="Features"
                    title="Section with Header"
                    description="This section uses SectionHeader with subtitle, title, and description."
                    align="center"
                  />
                  <div className="grid md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <GlassCard key={i} variant="subtle" size="sm">
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">Card {i}</p>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </Section>

                <Section spacing="sm" container="sm" background="surface">
                  <SectionHeader
                    title="Left Aligned, Narrow"
                    description="container='sm' makes this section narrower. Good for text-heavy content."
                    align="left"
                    as="h3"
                  />
                  <p className="text-muted-foreground">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                    eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                </Section>
              </div>

              <CodeBlock>{`import { Section, SectionHeader, SectionMotion } from '@/components/ui/section'

<Section spacing="lg" container="default" background="inset">
  <SectionHeader
    subtitle="Features"
    title="Section Title"
    description="Description text"
    align="center"
  />
  {/* content */}
</Section>

// Animated version
<SectionMotion spacing="lg" animateChildren>
  {/* children will stagger in */}
</SectionMotion>`}</CodeBlock>
            </DemoSection>
          </motion.div>

          <Divider variant="fade" />

          {/* ----------------------------------------------------------------
              GRADIENT BG
              ---------------------------------------------------------------- */}
          <motion.div variants={stagger.item}>
            <DemoSection title="GradientBg">
              <p className="text-muted-foreground mb-6">
                Subtle radial gradients to add depth behind content. Use{' '}
                <code className="text-primary">GradientContainer</code> for quick wrapping.
              </p>

              <DemoGrid cols={3}>
                {/* Hero */}
                <div className="relative h-40 rounded-xl overflow-hidden border border-border bg-background">
                  <GradientBg variant="hero" />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-sm text-muted-foreground">hero</span>
                  </div>
                </div>

                {/* Mesh */}
                <div className="relative h-40 rounded-xl overflow-hidden border border-border bg-background">
                  <GradientBg variant="mesh" />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-sm text-muted-foreground">mesh</span>
                  </div>
                </div>

                {/* Center */}
                <div className="relative h-40 rounded-xl overflow-hidden border border-border bg-background">
                  <GradientBg variant="center" />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-sm text-muted-foreground">center</span>
                  </div>
                </div>

                {/* Spotlight */}
                <div className="relative h-40 rounded-xl overflow-hidden border border-border bg-background">
                  <GradientBg variant="spotlight" />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-sm text-muted-foreground">spotlight</span>
                  </div>
                </div>

                {/* Ambient */}
                <div className="relative h-40 rounded-xl overflow-hidden border border-border bg-background">
                  <GradientBgMotion variant="ambient" animate />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-sm text-muted-foreground">ambient (animated)</span>
                  </div>
                </div>

                {/* Custom Color */}
                <div className="relative h-40 rounded-xl overflow-hidden border border-border bg-background">
                  <GradientBg variant="center" color="oklch(0.6 0.2 25 / 0.15)" />
                  <div className="relative z-10 flex items-center justify-center h-full">
                    <span className="text-sm text-muted-foreground">custom color</span>
                  </div>
                </div>
              </DemoGrid>

              <CodeBlock>{`import { GradientBg, GradientContainer } from '@/components/ui/gradient-bg'

// Manual positioning
<div className="relative">
  <GradientBg variant="hero" />
  <div className="relative z-10">{content}</div>
</div>

// Or use container
<GradientContainer variant="mesh">
  {content}
</GradientContainer>`}</CodeBlock>
            </DemoSection>
          </motion.div>

          <Divider variant="fade" />

          {/* ----------------------------------------------------------------
              DIVIDER
              ---------------------------------------------------------------- */}
          <motion.div variants={stagger.item}>
            <DemoSection title="Divider">
              <p className="text-muted-foreground mb-6">
                Hairline dividers with various styles. Supports labels and animations.
              </p>

              <div className="space-y-8">
                {/* Variants */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Variants
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">default</p>
                      <Divider variant="default" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">subtle</p>
                      <Divider variant="subtle" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">strong</p>
                      <Divider variant="strong" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">gradient</p>
                      <Divider variant="gradient" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">fade</p>
                      <Divider variant="fade" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">glow</p>
                      <Divider variant="glow" />
                    </div>
                  </div>
                </div>

                {/* With Labels */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    With Label
                  </h3>
                  <Divider label="Or continue with" />
                  <DividerMotion variant="fade" label="Section Break" />
                </div>

                {/* Vertical */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Vertical
                  </h3>
                  <div className="flex items-center gap-4 h-16">
                    <span className="text-muted-foreground">Item 1</span>
                    <Divider orientation="vertical" />
                    <span className="text-muted-foreground">Item 2</span>
                    <Divider orientation="vertical" variant="glow" />
                    <span className="text-muted-foreground">Item 3</span>
                  </div>
                </div>
              </div>

              <CodeBlock>{`import { Divider, DividerMotion } from '@/components/ui/divider'

<Divider variant="fade" />
<Divider variant="gradient" label="Or" />
<DividerMotion variant="glow" /> // Animates on scroll

// Vertical
<div className="flex items-center h-8">
  <span>A</span>
  <Divider orientation="vertical" />
  <span>B</span>
</div>`}</CodeBlock>
            </DemoSection>
          </motion.div>

          <Divider variant="fade" spacing="lg" />

          {/* ----------------------------------------------------------------
              COMBINED EXAMPLE
              ---------------------------------------------------------------- */}
          <motion.div variants={stagger.item}>
            <DemoSection title="Combined Example">
              <p className="text-muted-foreground mb-6">
                All primitives working together.
              </p>

              <GradientContainer variant="mesh" className="rounded-2xl overflow-hidden">
                <Section spacing="lg" background="none">
                  <SectionHeaderMotion
                    subtitle="Premium"
                    title="Everything Together"
                    description="A real-world example combining all primitives."
                    align="center"
                  />

                  <motion.div
                    variants={stagger.container}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-6"
                  >
                    {[
                      { icon: Zap, title: 'Fast', desc: 'Lightning quick response' },
                      { icon: Shield, title: 'Secure', desc: 'Bank-level encryption' },
                      { icon: Heart, title: 'Caring', desc: 'Human-first approach' },
                    ].map((item) => (
                      <motion.div key={item.title} variants={stagger.item}>
                        <GlassCardMotion hover="lift" className="text-center">
                          <div className="flex justify-center mb-4">
                            <IconBadge variant="gradient" size="lg">
                              <item.icon />
                            </IconBadge>
                          </div>
                          <GlassCardTitle className="mb-2">{item.title}</GlassCardTitle>
                          <GlassCardDescription>{item.desc}</GlassCardDescription>
                        </GlassCardMotion>
                      </motion.div>
                    ))}
                  </motion.div>

                  <Divider variant="fade" spacing="lg" />

                  <div className="text-center">
                    <Button size="lg">
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </Section>
              </GradientContainer>
            </DemoSection>
          </motion.div>
        </motion.div>
      </Section>
    </div>
  )
}
