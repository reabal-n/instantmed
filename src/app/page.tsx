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
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Animation variants for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
    },
  },
}

export default function Home() {
  const [hoveredService, setHoveredService] = useState<string | null>(null)

  return (
    <div className="min-h-screen">
      {/* Header - Glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 dark:bg-slate-900/80 dark:border-slate-700/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">InstantMed</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="#services" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Services
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
          </nav>
          <Link href="/start">
            <Button className="touch-target animate-pulse-cta">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              AHPRA Registered Australian Doctors
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Medical Certificates &<br />
              Prescriptions <span className="text-primary">Online</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Skip the waiting room. Get legitimate medical certificates and prescriptions 
              from Australian registered doctors in under 2 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/start">
                <Button size="lg" className="touch-target w-full sm:w-auto text-base px-8">
                  Start Your Consultation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="touch-target w-full sm:w-auto text-base px-8">
                  Learn More
                </Button>
              </Link>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>10,000+ Patients Served</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span>4.9/5 Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <span>Bank-Level Security</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 md:py-28 relative">
        {/* Soft section separator - top */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-100/50 to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Choose the service you need and complete your consultation in minutes
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Medical Certificate Card - Float and Glow */}
            <motion.div variants={itemVariants}>
              <Card 
                className={`relative overflow-hidden cursor-pointer border-slate-100 transition-all duration-300 ease-out ${
                  hoveredService === 'cert' 
                    ? '-translate-y-1 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_0_1px_oklch(0.55_0.15_185_/_0.2)] border-teal-500/30' 
                    : 'hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_0_1px_oklch(0.55_0.15_185_/_0.1)] hover:border-teal-500/20'
                }`}
                onMouseEnter={() => setHoveredService('cert')}
                onMouseLeave={() => setHoveredService(null)}
              >
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-6 transition-all duration-300 group-hover:bg-teal-100">
                    <FileText className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Medical Certificate</h3>
                  <p className="text-muted-foreground mb-6">
                    Get a legitimate medical certificate for work, university, or personal leave. 
                    Valid for sick leave, carer&apos;s leave, or exam deferrals.
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold text-teal-600">$24.95</span>
                      <span className="text-muted-foreground ml-2">AUD</span>
                    </div>
                    <Link href="/start?service=sick_cert">
                      <Button className="touch-target bg-teal-600 hover:bg-teal-700">
                        Get Certificate
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        Accepted by all Australian employers
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        Instant PDF delivery
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        Up to 7 days coverage
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Prescription Card - Float and Glow */}
            <motion.div variants={itemVariants}>
              <Card 
                className={`relative overflow-hidden cursor-pointer border-slate-100 transition-all duration-300 ease-out ${
                  hoveredService === 'script' 
                    ? '-translate-y-1 shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_0_1px_oklch(0.55_0.15_185_/_0.2)] border-teal-500/30' 
                    : 'hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_0_1px_oklch(0.55_0.15_185_/_0.1)] hover:border-teal-500/20'
                }`}
                onMouseEnter={() => setHoveredService('script')}
                onMouseLeave={() => setHoveredService(null)}
              >
                <CardContent className="p-8">
                  <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6">
                    <Pill className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Prescription Renewal</h3>
                  <p className="text-muted-foreground mb-6">
                    Renew your regular medications without visiting a clinic. 
                    eScript sent directly to your preferred pharmacy.
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold text-teal-600">$29.95</span>
                      <span className="text-muted-foreground ml-2">AUD</span>
                    </div>
                    <Link href="/start?service=prescription">
                      <Button className="touch-target bg-teal-600 hover:bg-teal-700">
                        Get Prescription
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        PBS eligible medications
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        eScript to any pharmacy
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        Repeats included
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28 bg-gradient-to-b from-slate-50 to-white relative">
        {/* Soft fade separators */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to get your medical certificate or prescription
            </p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants} className="text-center">
              <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6 relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-teal-100">
                <span className="text-3xl font-bold text-teal-600">1</span>
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-slate-200" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Answer Questions</h3>
              <p className="text-muted-foreground">
                Complete our quick medical questionnaire. Takes less than 3 minutes.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="text-center">
              <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6 relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-teal-100">
                <span className="text-3xl font-bold text-teal-600">2</span>
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-slate-200" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Doctor Review</h3>
              <p className="text-muted-foreground">
                An Australian registered doctor reviews your case and approves your request.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="text-center">
              <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-teal-100">
                <span className="text-3xl font-bold text-teal-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Receive Document</h3>
              <p className="text-muted-foreground">
                Get your medical certificate or eScript delivered instantly to your email.
              </p>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 }}
          >
            <Link href="/start">
              <Button size="lg" className="touch-target text-base px-8 bg-teal-600 hover:bg-teal-700 animate-pulse-cta">
                Start Now — It&apos;s Quick & Easy
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 md:py-28 relative">
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Trusted by Thousands of Australians
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  InstantMed is fully compliant with Australian telehealth regulations. 
                  All consultations are conducted by AHPRA registered medical practitioners.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-teal-100">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <span className="font-medium">AHPRA Registered Doctors</span>
                      <p className="text-sm text-muted-foreground">
                        All our doctors are fully registered with the Australian Health Practitioner Regulation Agency
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-teal-100">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <span className="font-medium">TGA Compliant</span>
                      <p className="text-sm text-muted-foreground">
                        Our prescription service follows all Therapeutic Goods Administration guidelines
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-teal-100">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <span className="font-medium">Privacy Protected</span>
                      <p className="text-sm text-muted-foreground">
                        Your health information is encrypted and stored in compliance with Australian Privacy Principles
                      </p>
                    </div>
                  </li>
                </ul>
              </motion.div>
              <motion.div 
                className="relative"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
              >
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-teal-100/50 to-teal-50/50 flex items-center justify-center p-4">
                  <div className="w-full h-full rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-teal-600" />
                      <span className="text-sm font-medium text-muted-foreground">Average Response Time</span>
                    </div>
                    <div className="text-5xl font-bold text-teal-600 mb-2">{"<"}2 hrs</div>
                    <p className="text-sm text-muted-foreground">
                      Most requests approved within 2 hours during business hours
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-teal-600 to-teal-700 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        
        <motion.div 
          className="container mx-auto px-4 text-center relative z-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Skip the Waiting Room?
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
            Join thousands of Australians who trust InstantMed for their telehealth needs.
          </p>
          <Link href="/start">
            <Button 
              size="lg" 
              className="touch-target text-base px-8 bg-white text-teal-700 hover:bg-white/90 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.1)]"
            >
              Start Your Consultation Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold">InstantMed</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact Us
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} InstantMed. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
