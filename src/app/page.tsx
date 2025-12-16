'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Pill, 
  Shield, 
  Clock, 
  ArrowRight,
  Star,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TestimonialCarousel } from '@/components/homepage/testimonial-carousel'
import { FAQAccordion } from '@/components/homepage/faq-accordion'
import { FeatureBento } from '@/components/homepage/feature-bento'
import { ScrollProgress, ScrollToTop } from '@/components/shared/scroll-progress'
import { MobileMenu } from '@/components/shared/mobile-menu'
import { 
  Section, 
  SectionMotion, 
  SectionHeaderMotion 
} from '@/components/ui/section'
import { GlassCard } from '@/components/ui/glass-card'
import { GradientBg, GradientBgMotion } from '@/components/ui/gradient-bg'
import { IconBadge } from '@/components/ui/icon-badge'
import { Divider } from '@/components/ui/divider'
import { DisplayCards, type DisplayCard } from '@/components/ui/display-cards'
import { RotatingText } from '@/components/ui/rotating-text'
import { ServiceCardGrid, type ServiceCardProps } from '@/components/ui/service-card'
import { 
  stagger, 
  fadeUp, 
  slideRight,
  hoverLift,
  press,
} from '@/lib/motion'

const navLinks = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#services', label: 'Services' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQ' },
  { href: '/auth/login', label: 'Login' },
]

// Hero rotating words
const rotatingWords = ['faster', 'smarter', 'easier', 'today']

// Display cards for hero
const heroDisplayCards: DisplayCard[] = [
  {
    id: 'cert',
    title: 'Medical Certificate',
    description: 'Valid proof of illness for work or uni',
    icon: <FileText className="w-5 h-5" />,
    accentColor: 'oklch(0.65 0.15 185)',
  },
  {
    id: 'script',
    title: 'Prescription',
    description: 'Your regular meds, sent to any pharmacy',
    icon: <Pill className="w-5 h-5" />,
    accentColor: 'oklch(0.6 0.15 280)',
  },
]

// Service card data
const services: ServiceCardProps[] = [
  {
    title: 'Medical Certificate',
    description: "Sick? Need proof for work or uni?",
    price: '$29',
    time: '~1 hour',
    icon: FileText,
    iconVariant: 'gradient',
    href: '/start?service=sick_cert',
    popular: true,
  },
  {
    title: 'Prescription',
    description: 'Need your regular medications?',
    price: '$39',
    time: '~1 hour',
    icon: Pill,
    iconVariant: 'secondary',
    href: '/start?service=prescription',
  },
]

// How it works steps
const steps = [
  {
    step: 1,
    title: 'Answer a few questions',
    description: 'Quick form, takes about 2 minutes. No account needed.',
  },
  {
    step: 2,
    title: 'A doctor reviews it',
    description: 'A real GP looks at your request. Usually done within an hour.',
  },
  {
    step: 3,
    title: 'Done',
    description: 'Certificate in your inbox. Script sent to your pharmacy.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Scroll Progress Indicator */}
      <ScrollProgress />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-navbar">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <IconBadge variant="gradient" size="sm">
              <Stethoscope className="w-4 h-4" />
            </IconBadge>
            <span className="text-lg font-semibold text-foreground">InstantMed</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Services
            </Link>
            <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/start" className="hidden md:block">
              <motion.div {...press}>
                <Button size="sm">
                  Get started
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
            <MobileMenu links={navLinks} />
          </div>
        </div>
      </header>
      
      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Hero Section - Two Column Layout */}
      <section className="relative min-h-[calc(100vh-4rem)] pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background gradients and blur blobs */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Main hero gradient */}
          <GradientBgMotion variant="hero" blur="lg" />
          
          {/* Ambient mesh gradient */}
          <GradientBg variant="mesh" intensity="subtle" className="opacity-60" />
          
          {/* Blur blobs */}
          <motion.div
            className="absolute top-20 -left-20 w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, oklch(0.65 0.15 185 / 0.15) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              x: [0, 20, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-20 -right-20 w-[400px] h-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, oklch(0.6 0.12 280 / 0.12) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
            animate={{
              x: [0, -15, 0],
              y: [0, 15, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, oklch(0.7 0.1 200 / 0.08) 0%, transparent 60%)',
              filter: 'blur(80px)',
            }}
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-12rem)]">
            {/* Left Column - Text Content */}
            <motion.div
              variants={stagger.container}
              initial="initial"
              animate="animate"
              className="order-2 lg:order-1"
            >
              {/* Badge */}
              <motion.div variants={stagger.item}>
                <Badge 
                  variant="secondary" 
                  className="mb-6 px-4 py-2 text-sm font-medium glass border-border/50"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-primary" />
                  ⚡ Healthcare that doesn't make you wait
                </Badge>
              </motion.div>
              
              {/* Headline with rotating word */}
              <motion.h1 
                variants={stagger.item}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
              >
                <span className="text-foreground">Feel better,{' '}</span>
                <br className="hidden sm:block" />
                <RotatingText
                  words={rotatingWords}
                  interval={2500}
                  animation="slide"
                  className="text-primary inline-block min-w-[140px] md:min-w-[180px]"
                />
              </motion.h1>
              
              {/* Subheadline */}
              <motion.p 
                variants={stagger.item}
                className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed"
              >
                Medical certificates, prescriptions & referrals from AHPRA-registered doctors. 
                No appointments. No waiting rooms.
              </motion.p>
              
              {/* CTAs */}
              <motion.div 
                variants={stagger.item}
                className="flex flex-col sm:flex-row gap-3 mb-8"
              >
                <Link href="/start">
                  <motion.div {...hoverLift}>
                    <Button size="lg" className="w-full sm:w-auto text-base px-8">
                      Browse treatments
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
                <Link href="#how-it-works">
                  <motion.div {...press}>
                    <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8">
                      How it works
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
              
              {/* Trust indicators */}
              <motion.div 
                variants={stagger.item}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
              >
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
                  <span>AHPRA GPs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>~45min</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Display Cards */}
            <motion.div
              variants={slideRight}
              initial="initial"
              animate="animate"
              className="order-1 lg:order-2 flex justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-md">
                {/* Glow behind cards */}
                <div 
                  className="absolute inset-0 -m-8 rounded-3xl opacity-60"
                  style={{
                    background: 'radial-gradient(ellipse at center, oklch(0.65 0.15 185 / 0.2) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                  }}
                />
                
                {/* Display Cards Stack */}
                <DisplayCards
                  cards={heroDisplayCards}
                  maxVisible={3}
                  autoRotateInterval={4000}
                  direction="up"
                  className="relative z-10"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <SectionMotion 
        id="services" 
        spacing="lg" 
        background="inset"
        className="relative"
      >
        <GradientBg variant="mesh" intensity="subtle" />
        
        <div className="container mx-auto px-4 relative z-10">
          <SectionHeaderMotion
            subtitle="Services"
            title="What can we help with?"
            description="Pick what you need. A real doctor reviews it — usually done in about an hour."
            align="center"
          />
          
          {/* Service Cards Grid */}
          <ServiceCardGrid 
            services={services} 
            className="max-w-4xl mx-auto"
          />
          
          {/* Help text */}
          <motion.p 
            className="text-center text-sm text-muted-foreground mt-10"
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            Not sure which service you need?{' '}
            <Link href="#how-it-works" className="text-primary hover:text-primary/80 underline underline-offset-2">
              Learn how it works
            </Link>{' '}
            or{' '}
            <Link href="#faq" className="text-primary hover:text-primary/80 underline underline-offset-2">
              browse our FAQ
            </Link>
          </motion.p>
        </div>
      </SectionMotion>

      {/* How It Works Section */}
      <Section id="how-it-works" spacing="lg" background="surface">
        <div className="container mx-auto px-4">
          <SectionHeaderMotion
            title="How it works ✨"
            description="Three steps. No phone trees. No video calls. Just results."
            align="center"
          />
          
          <motion.div 
            className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
            variants={stagger.container}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {steps.map((item, index) => (
              <motion.div 
                key={item.step}
                variants={stagger.item} 
                className="relative"
              >
                <GlassCard variant="subtle" className="h-full text-center">
                  <IconBadge variant="gradient" size="lg" className="mx-auto mb-4">
                    <span className="text-lg font-bold">{item.step}</span>
                  </IconBadge>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </GlassCard>
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-border" />
                )}
              </motion.div>
            ))}
          </motion.div>
          
          <motion.div 
            className="text-center mt-10"
            variants={fadeUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <Link href="/start">
              <motion.div {...hoverLift}>
                <Button size="lg" className="text-base px-8">
                  Get started now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* Feature Bento Grid Section */}
      <SectionMotion 
        id="features" 
        spacing="lg" 
        background="inset"
        className="relative"
      >
        <GradientBg variant="ambient" intensity="subtle" />
        
        <div className="container mx-auto px-4 relative z-10">
          <SectionHeaderMotion
            title="Why InstantMed?"
            description="GP waitlists are weeks long. You shouldn't need to take time off for a simple med cert or script."
            align="center"
          />
          
          <div className="max-w-5xl mx-auto">
            <FeatureBento />
          </div>
        </div>
      </SectionMotion>

      {/* Testimonials Section */}
      <Section spacing="lg" background="surface">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-10"
            variants={stagger.container}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div variants={stagger.item} className="flex items-center justify-center gap-1.5 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
              <span className="ml-2 text-foreground font-medium">4.9/5 from 200+ reviews</span>
            </motion.div>
            <motion.h2 variants={stagger.item} className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
              What people say
            </motion.h2>
            <motion.p variants={stagger.item} className="text-muted-foreground text-lg max-w-lg mx-auto">
              Real feedback from real patients
            </motion.p>
          </motion.div>
          
          <div className="max-w-3xl mx-auto">
            <TestimonialCarousel />
          </div>
        </div>
      </Section>

      {/* FAQ Section */}
      <SectionMotion id="faq" spacing="lg" background="inset">
        <div className="container mx-auto px-4">
          <SectionHeaderMotion align="center">
            <Badge variant="secondary" className="mb-4 glass">
              <HelpCircle className="w-4 h-4 mr-1.5" />
              Questions?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">We get asked this a lot 🤔</h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              The quick answers to the most common questions
            </p>
          </SectionHeaderMotion>
          
          <div className="max-w-2xl mx-auto">
            <FAQAccordion limit={6} />
          </div>
        </div>
      </SectionMotion>

      {/* CTA Section */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/90" />
        <GradientBg variant="spotlight" color="oklch(1 0 0 / 0.1)" blur="lg" />
        
        <motion.div 
          className="container mx-auto px-4 text-center relative z-10"
          variants={fadeUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-foreground">
            That's basically it
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-md mx-auto">
            Need a med cert or script? We can probably help. Takes a couple of minutes to find out.
          </p>
          <Link href="/start">
            <motion.div {...hoverLift}>
              <Button 
                size="lg" 
                variant="secondary"
                className="text-base px-8 bg-white text-primary hover:bg-white/95"
              >
                Get started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </section>

      <Divider variant="subtle" />

      {/* Footer */}
      <footer className="py-10 bg-surface">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <IconBadge variant="default" size="sm">
                <Stethoscope className="w-4 h-4" />
              </IconBadge>
              <span className="font-semibold text-foreground">InstantMed</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} InstantMed
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
