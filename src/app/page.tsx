'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Pill, 
  Shield, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Stethoscope,
  Lock,
  Star,
  HelpCircle,
  FlaskConical,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LiveActivityIndicator } from '@/components/shared/live-activity-indicator'
import { TestimonialCarousel } from '@/components/homepage/testimonial-carousel'
import { FAQAccordion } from '@/components/homepage/faq-accordion'
import { FeatureBento } from '@/components/homepage/feature-bento'
import { ScrollProgress, ScrollToTop } from '@/components/shared/scroll-progress'
import { MobileMenu } from '@/components/shared/mobile-menu'

const navLinks = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#services', label: 'Services' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQ' },
  { href: '/auth/login', label: 'Login' },
]

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },
}

export default function Home() {
  const [hoveredService, setHoveredService] = useState<'cert' | 'script' | 'pathology' | 'referral' | null>(null)

  return (
    <div className="min-h-screen">
      {/* Scroll Progress Indicator */}
      <ScrollProgress />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-teal-100/50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">InstantMed</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              How it works
            </Link>
            <Link href="#services" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Services
            </Link>
            <Link href="#faq" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              FAQ
            </Link>
            <Link href="/auth/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Login
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/start" className="hidden md:block">
              <Button className="bg-teal-600 hover:bg-teal-700 text-sm h-9 px-4">
                Get started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <MobileMenu links={navLinks} />
          </div>
        </div>
      </header>
      
      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Hero Section */}
      <section className="gradient-hero pt-28 pb-16 md:pt-36 md:pb-24 relative overflow-hidden pattern-overlay">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-200/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Badge 
                variant="secondary" 
                className="mb-6 px-4 py-2 text-sm font-medium bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm"
              >
                <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                Australia&apos;s fastest online doctor
              </Badge>
            </motion.div>
            
            {/* Headline */}
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">Feel better,{' '}</span>
              <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">faster</span>
            </motion.h1>
            
            {/* Subheadline */}
            <motion.p 
              className="text-lg md:text-xl text-slate-500 mb-8 max-w-xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Medical certificates, prescriptions & referrals from AHPRA-registered doctors. 
              No appointments. No waiting rooms.
            </motion.p>
            
            {/* CTAs */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-3 justify-center mb-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link href="/start">
                <Button size="lg" className="touch-target w-full sm:w-auto text-base px-8 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg shadow-teal-500/30 rounded-xl">
                  Browse treatments
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="touch-target w-full sm:w-auto text-base px-8 glass border-2 border-slate-200 hover:border-teal-300 rounded-xl">
                  How it works
                </Button>
              </Link>
            </motion.div>
            
            {/* Trust indicators - inline style */}
            <motion.div 
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="font-medium">4.9/5</span>
                <span className="text-slate-400">from 200+ reviews</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-teal-500" />
                <span>AHPRA-registered GPs</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-500" />
                <span>Average 45min response</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 md:py-24 bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 pattern-overlay relative">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">Browse treatments</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Click what you need. Fill a quick form. Doctor reviews it. Done.
            </p>
          </motion.div>
          
          {/* Services tags */}
          <motion.div 
            className="flex flex-wrap items-center justify-center gap-3 mb-10 text-sm"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-slate-400">Also available:</span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <FileText className="w-4 h-4 text-teal-500" /> Med Certificates
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <Stethoscope className="w-4 h-4 text-teal-500" /> Specialist Referrals
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <FlaskConical className="w-4 h-4 text-rose-500" /> Blood Tests
            </span>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Medical Certificate Card */}
            <motion.div variants={itemVariants}>
              <Card 
                className={`relative h-full overflow-hidden cursor-pointer border-2 transition-all duration-200 bg-white shadow-sm ${
                  hoveredService === 'cert' 
                    ? 'border-teal-400 shadow-xl shadow-teal-500/20 scale-[1.02]' 
                    : 'border-slate-200 hover:border-teal-300 hover:shadow-lg'
                }`}
                onMouseEnter={() => setHoveredService('cert')}
                onMouseLeave={() => setHoveredService(null)}
              >
                {/* Popular badge */}
                <Badge className="absolute -top-0 right-4 translate-y-[-50%] bg-teal-500 hover:bg-teal-500 text-white shadow-sm">
                  Most popular
                </Badge>
                
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-500/30">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Medical Certificate</h3>
                      <p className="text-slate-500 text-sm">Work, uni & carer&apos;s leave certificates</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xl font-bold text-slate-900">$19.95</span>
                    <div className="flex items-center gap-1 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>~45 mins</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-5">
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Employer-ready format
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Same-day delivery
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Backdating available
                    </li>
                  </ul>
                  
                  <Link href="/start?service=sick_cert" className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 group">
                    Get started
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Prescription Card */}
            <motion.div variants={itemVariants}>
              <Card 
                className={`relative h-full overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                  hoveredService === 'script' 
                    ? 'border-teal-300 shadow-lg shadow-teal-500/5' 
                    : 'border-slate-100 hover:border-teal-200 hover:shadow-md'
                }`}
                onMouseEnter={() => setHoveredService('script')}
                onMouseLeave={() => setHoveredService(null)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Pill className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Prescription</h3>
                      <p className="text-slate-500 text-sm">Repeat scripts & medication reviews</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xl font-bold text-slate-900">$24.95</span>
                    <div className="flex items-center gap-1 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>~1 hour</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-5">
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Sent to your pharmacy
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Repeat prescriptions
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      New medications
                    </li>
                  </ul>
                  
                  <Link href="/start?service=prescription" className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 group">
                    Get started
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pathology Card */}
            <motion.div variants={itemVariants}>
              <Card 
                className={`relative h-full overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                  hoveredService === 'pathology' 
                    ? 'border-teal-300 shadow-lg shadow-teal-500/5' 
                    : 'border-slate-100 hover:border-teal-200 hover:shadow-md'
                }`}
                onMouseEnter={() => setHoveredService('pathology')}
                onMouseLeave={() => setHoveredService(null)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                      <FlaskConical className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Pathology & Imaging</h3>
                      <p className="text-slate-500 text-sm">Blood tests, scans & specialist referrals</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xl font-bold text-slate-900">$29.95</span>
                    <div className="flex items-center gap-1 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>~1 hour</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-5">
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Bulk-billed tests
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Specialist referrals
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Results tracking
                    </li>
                  </ul>
                  
                  <Link href="/start?service=pathology" className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 group">
                    Get started
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Specialist Referral Card */}
            <motion.div variants={itemVariants}>
              <Card 
                className={`relative h-full overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                  hoveredService === 'referral' 
                    ? 'border-teal-300 shadow-lg shadow-teal-500/5' 
                    : 'border-slate-100 hover:border-teal-200 hover:shadow-md'
                }`}
                onMouseEnter={() => setHoveredService('referral')}
                onMouseLeave={() => setHoveredService(null)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Specialist Referral</h3>
                      <p className="text-slate-500 text-sm">Dermatology, cardiology & more</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-xl font-bold text-slate-900">$29.95</span>
                    <div className="flex items-center gap-1 text-slate-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>~1 hour</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-5">
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Valid for 12 months
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      Medicare rebate
                    </li>
                    <li className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      All specialists
                    </li>
                  </ul>
                  
                  <Link href="/start?service=referral" className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 group">
                    Get started
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
          
          {/* Help text */}
          <motion.p 
            className="text-center text-sm text-slate-400 mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            Not sure which service you need?{' '}
            <Link href="#how-it-works" className="text-teal-500 hover:text-teal-600 underline underline-offset-2">
              Learn how it works
            </Link>{' '}
            or{' '}
            <Link href="#faq" className="text-teal-500 hover:text-teal-600 underline underline-offset-2">
              browse our FAQ
            </Link>
          </motion.p>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-24 bg-white/80 backdrop-blur-sm relative">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">How it works</h2>
            <p className="text-slate-500 text-lg max-w-lg mx-auto">
              Three steps. No phone calls. No video chats.
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div 
              variants={itemVariants} 
              className="relative bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-2xl p-6 text-center border border-slate-200 shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-md shadow-teal-500/30">
                <span className="text-xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Fill a quick form</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Answer a few questions about your symptoms. Takes under 3 minutes.
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-slate-200" />
            </motion.div>
            
            <motion.div 
              variants={itemVariants} 
              className="relative bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-2xl p-6 text-center border border-slate-200 shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-md shadow-teal-500/30">
                <span className="text-xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Doctor reviews</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                An AHPRA-registered GP reviews your request within 45 minutes.
              </p>
              {/* Connector line */}
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-slate-200" />
            </motion.div>
            
            <motion.div 
              variants={itemVariants} 
              className="bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-2xl p-6 text-center border border-slate-200 shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-md shadow-teal-500/30">
                <span className="text-xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Get your document</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Download your certificate or get your script sent to any pharmacy.
              </p>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="text-center mt-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.3 }}
          >
            <Link href="/start">
              <Button size="lg" className="touch-target text-base px-8 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg shadow-teal-500/30 rounded-xl">
                Get started now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feature Bento Grid Section */}
      <section id="features" className="py-16 md:py-24 bg-gradient-to-br from-teal-50 via-cyan-50 to-amber-50 pattern-overlay relative">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">Why choose us?</h2>
            <p className="text-slate-500 text-lg max-w-lg mx-auto">
              Built for Australians who value their time, privacy, and health
            </p>
          </motion.div>
          
          <div className="max-w-5xl mx-auto">
            <FeatureBento />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 bg-white/80 backdrop-blur-sm relative">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
              <span className="ml-2 text-slate-600 font-medium">4.9/5 from 200+ reviews</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">Loved by Australians</h2>
            <p className="text-slate-500 text-lg max-w-lg mx-auto">
              Real stories from real patients
            </p>
          </motion.div>
          
          <div className="max-w-3xl mx-auto">
            <TestimonialCarousel />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24 bg-warm-muted relative">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Badge variant="secondary" className="mb-4 bg-white/80">
              <HelpCircle className="w-4 h-4 mr-1.5" />
              Got questions?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900">Frequently asked questions</h2>
            <p className="text-slate-500 text-lg max-w-lg mx-auto">
              Everything you need to know about our services
            </p>
          </motion.div>
          
          <div className="max-w-2xl mx-auto">
            <FAQAccordion limit={6} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-teal-600 via-teal-600 to-teal-700 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        
        <motion.div 
          className="container mx-auto px-4 text-center relative z-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to feel better?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
            Join thousands of Australians getting healthcare on their terms.
          </p>
          <Link href="/start">
            <Button 
              size="lg" 
              className="touch-target text-base px-8 bg-white text-teal-700 hover:bg-white/95 shadow-lg"
            >
              Get started now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-slate-50 border-t border-slate-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-900">InstantMed</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
              <Link href="/terms" className="hover:text-slate-900 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-slate-900 transition-colors">
                Contact
              </Link>
            </nav>
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} InstantMed
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
