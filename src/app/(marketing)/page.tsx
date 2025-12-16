import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Shield,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Zap,
  FileText,
  Heart,
  Pill,
  Scale,
  Stethoscope,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Clock className="w-3 h-3 mr-1" />
              Average response: 42 minutes
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Doctor consultations.
              <span className="text-primary"> Within 1 hour.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Skip the waiting room. Get prescriptions and medical certificates from 
              Australian-registered doctors — all online, all within an hour.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/start">
                  Start Consultation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/how-it-works">See How It Works</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              No Medicare rebate. Prices from $29. Full refund if declined.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">1 hour</p>
              <p className="text-sm text-muted-foreground">Response guarantee</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">50,000+</p>
              <p className="text-sm text-muted-foreground">Consultations completed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">4.9/5</p>
              <p className="text-sm text-muted-foreground">Patient satisfaction</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">AHPRA</p>
              <p className="text-sm text-muted-foreground">Registered doctors</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What we can help with</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our doctors can assist with a range of common health concerns, 
              saving you time without compromising on care.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ServiceCard
              icon={<Scale className="w-6 h-6" />}
              title="Weight Management"
              description="Clinically-supervised programs with ongoing support and monitoring."
              price="From $79"
              href="/services/weight-management"
            />
            <ServiceCard
              icon={<Heart className="w-6 h-6" />}
              title="Men's Health"
              description="Discreet consultations for sensitive health concerns."
              price="From $39"
              href="/services/mens-health"
            />
            <ServiceCard
              icon={<FileText className="w-6 h-6" />}
              title="Medical Certificates"
              description="Sick leave certificates for work or study, issued same-day."
              price="$29"
              href="/services/medical-certificates"
            />
            <ServiceCard
              icon={<Pill className="w-6 h-6" />}
              title="Script Renewals"
              description="Renew existing prescriptions without visiting a clinic."
              price="From $39"
              href="/services/prescriptions"
            />
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/services">View All Services</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground">Three simple steps. Under 5 minutes of your time.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number="1"
              title="Answer questions"
              description="Complete a brief health questionnaire from your phone or computer. Takes 2-3 minutes."
            />
            <StepCard
              number="2"
              title="Doctor reviews"
              description="An Australian-registered doctor reviews your request within 1 hour (often much faster)."
            />
            <StepCard
              number="3"
              title="Get your result"
              description="Approved prescriptions are sent to your pharmacy. Certificates delivered to your inbox."
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Why choose InstantMed?</h2>
              <div className="space-y-6">
                <BenefitItem
                  icon={<Clock className="w-5 h-5" />}
                  title="1-hour guarantee"
                  description="We commit to reviewing your request within 60 minutes, or your money back."
                />
                <BenefitItem
                  icon={<Shield className="w-5 h-5" />}
                  title="Real doctors, real care"
                  description="Every consultation is reviewed by an AHPRA-registered Australian doctor."
                />
                <BenefitItem
                  icon={<Smartphone className="w-5 h-5" />}
                  title="100% online"
                  description="No video calls, no waiting rooms. Complete everything from your device."
                />
                <BenefitItem
                  icon={<CheckCircle className="w-5 h-5" />}
                  title="Full refund if declined"
                  description="If our doctors can't approve your request, you pay nothing."
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 lg:p-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-background rounded-lg shadow-sm">
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Priority option available</p>
                    <p className="text-sm text-muted-foreground">30-minute response for urgent needs</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-background rounded-lg shadow-sm">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Follow-up included</p>
                    <p className="text-sm text-muted-foreground">Message your doctor if needed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-background rounded-lg shadow-sm">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Bank-level security</p>
                    <p className="text-sm text-muted-foreground">Your data is encrypted & protected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to skip the wait?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Start your consultation now and get a response from a doctor within 1 hour.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/start">
              Get Started Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Limitations Notice */}
      <section className="py-12 border-t">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground mb-3">Important Information</h3>
            <p className="mb-4">
              InstantMed is not suitable for emergencies. If you're experiencing chest pain, 
              difficulty breathing, or other urgent symptoms, call 000 immediately.
            </p>
            <p>
              Our service is designed for non-urgent health needs. Some conditions require 
              in-person examination and cannot be treated via telehealth. 
              <Link href="/limitations" className="text-primary hover:underline ml-1">
                View service limitations →
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function ServiceCard({
  icon,
  title,
  description,
  price,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  price: string
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
        <CardContent className="pt-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {icon}
          </div>
          <h3 className="font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <p className="text-sm font-medium text-primary">{price}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function BenefitItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
