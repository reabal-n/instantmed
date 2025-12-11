'use client'

import { useState } from 'react'
import Link from 'next/link'
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

export default function Home() {
  const [hoveredService, setHoveredService] = useState<string | null>(null)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
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
            <Button className="touch-target">
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
      <section id="services" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Choose the service you need and complete your consultation in minutes
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Medical Certificate Card */}
            <Card 
              className={`relative overflow-hidden transition-all duration-300 cursor-pointer ${
                hoveredService === 'cert' ? 'shadow-xl scale-[1.02]' : 'shadow-md'
              }`}
              onMouseEnter={() => setHoveredService('cert')}
              onMouseLeave={() => setHoveredService(null)}
            >
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Medical Certificate</h3>
                <p className="text-muted-foreground mb-6">
                  Get a legitimate medical certificate for work, university, or personal leave. 
                  Valid for sick leave, carer&apos;s leave, or exam deferrals.
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold text-primary">$24.95</span>
                    <span className="text-muted-foreground ml-2">AUD</span>
                  </div>
                  <Link href="/start?service=sick_cert">
                    <Button className="touch-target">
                      Get Certificate
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-6 pt-6 border-t border-border">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Accepted by all Australian employers
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Instant PDF delivery
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Up to 7 days coverage
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Prescription Card */}
            <Card 
              className={`relative overflow-hidden transition-all duration-300 cursor-pointer ${
                hoveredService === 'script' ? 'shadow-xl scale-[1.02]' : 'shadow-md'
              }`}
              onMouseEnter={() => setHoveredService('script')}
              onMouseLeave={() => setHoveredService(null)}
            >
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-6">
                  <Pill className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Prescription Renewal</h3>
                <p className="text-muted-foreground mb-6">
                  Renew your regular medications without visiting a clinic. 
                  eScript sent directly to your preferred pharmacy.
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold text-primary">$29.95</span>
                    <span className="text-muted-foreground ml-2">AUD</span>
                  </div>
                  <Link href="/start?service=prescription">
                    <Button className="touch-target">
                      Get Prescription
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-6 pt-6 border-t border-border">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      PBS eligible medications
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      eScript to any pharmacy
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Repeats included
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three simple steps to get your medical certificate or prescription
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 relative">
                <span className="text-3xl font-bold text-primary">1</span>
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-border" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Answer Questions</h3>
              <p className="text-muted-foreground">
                Complete our quick medical questionnaire. Takes less than 3 minutes.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 relative">
                <span className="text-3xl font-bold text-primary">2</span>
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                  <ArrowRight className="w-8 h-8 text-border" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Doctor Review</h3>
              <p className="text-muted-foreground">
                An Australian registered doctor reviews your case and approves your request.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Receive Document</h3>
              <p className="text-muted-foreground">
                Get your medical certificate or eScript delivered instantly to your email.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link href="/start">
              <Button size="lg" className="touch-target text-base px-8">
                Start Now — It&apos;s Quick & Easy
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Trusted by Thousands of Australians
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  InstantMed is fully compliant with Australian telehealth regulations. 
                  All consultations are conducted by AHPRA registered medical practitioners.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium">AHPRA Registered Doctors</span>
                      <p className="text-sm text-muted-foreground">
                        All our doctors are fully registered with the Australian Health Practitioner Regulation Agency
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium">TGA Compliant</span>
                      <p className="text-sm text-muted-foreground">
                        Our prescription service follows all Therapeutic Goods Administration guidelines
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium">Privacy Protected</span>
                      <p className="text-sm text-muted-foreground">
                        Your health information is encrypted and stored in compliance with Australian Privacy Principles
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 rounded-2xl bg-card shadow-2xl p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">Average Response Time</span>
                    </div>
                    <div className="text-5xl font-bold text-primary mb-2">{"<"}2 hrs</div>
                    <p className="text-sm text-muted-foreground">
                      Most requests approved within 2 hours during business hours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Skip the Waiting Room?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto">
            Join thousands of Australians who trust InstantMed for their telehealth needs.
          </p>
          <Link href="/start">
            <Button 
              size="lg" 
              variant="secondary" 
              className="touch-target text-base px-8"
            >
              Start Your Consultation Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
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
