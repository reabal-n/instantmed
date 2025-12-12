import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Zap, ArrowRight, Info } from 'lucide-react'

export const metadata = {
  title: 'Pricing | InstantMed',
  description: 'Transparent pricing for all InstantMed telehealth services. No hidden fees.',
}

const services = [
  {
    name: 'Medical Certificate',
    description: 'Sick leave certificate for work or study',
    price: 29,
    features: [
      'Same-day issue',
      'PDF delivered to email',
      'Valid for employers & universities',
      '1-3 day coverage',
    ],
    popular: false,
  },
  {
    name: 'Script Renewal',
    description: 'Renew existing prescriptions',
    price: 39,
    features: [
      'eScript sent to your phone',
      'Use at any pharmacy',
      'Common medications',
      'Blood pressure, cholesterol, etc.',
    ],
    popular: false,
  },
  {
    name: "Men's Health",
    description: 'Discreet consultations for sensitive concerns',
    price: 49,
    features: [
      'Confidential service',
      'Evidence-based treatments',
      'Ongoing support available',
      'Quick questionnaire',
    ],
    popular: true,
  },
  {
    name: 'Weight Management',
    description: 'Clinically-supervised weight loss programs',
    price: 79,
    features: [
      'Doctor-supervised program',
      'Regular check-ins',
      'Medication if appropriate',
      'BMI 30+ required',
    ],
    popular: true,
  },
]

export default function PricingPage() {
  return (
    <div className="py-16">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground text-lg">
            No hidden fees. No surprises. Full refund if your request is declined.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {services.map((service) => (
            <Card
              key={service.name}
              className={`relative ${service.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {service.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{service.name}</CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${service.price}</span>
                  <span className="text-muted-foreground ml-1">AUD</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={service.popular ? 'default' : 'outline'} asChild>
                  <Link href="/start">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Priority Option */}
        <Card className="max-w-2xl mx-auto mb-12 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">Priority Service</h3>
                <p className="text-muted-foreground mb-3">
                  Need a faster response? Add Priority to any service for guaranteed 
                  30-minute review (instead of 1 hour).
                </p>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="w-3 h-3" />
                    30-min guarantee
                  </Badge>
                  <span className="font-semibold">+$20</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Included */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">What's Included</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Doctor consultation</p>
                <p className="text-sm text-muted-foreground">
                  Every request reviewed by an AHPRA-registered doctor
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">1-hour response</p>
                <p className="text-sm text-muted-foreground">
                  Guaranteed response time or your money back
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Follow-up messaging</p>
                <p className="text-sm text-muted-foreground">
                  Message your doctor if you have questions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Secure platform</p>
                <p className="text-sm text-muted-foreground">
                  Bank-level encryption for your health data
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Policy */}
        <div className="bg-muted/50 rounded-lg p-8 max-w-3xl mx-auto">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Our Refund Promise</h3>
              <p className="text-muted-foreground mb-4">
                If our doctor determines that telehealth isn't appropriate for your situation 
                and declines your request, you'll receive a <strong>full refund</strong> within 
                3-5 business days. No questions asked.
              </p>
              <p className="text-sm text-muted-foreground">
                Note: Refunds are not provided for approved consultations or if you choose not 
                to proceed after approval.
                <Link href="/refund-policy" className="text-primary hover:underline ml-1">
                  View full refund policy →
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Complete your consultation in under 5 minutes.
          </p>
          <Button size="lg" asChild>
            <Link href="/start">
              Start Consultation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
