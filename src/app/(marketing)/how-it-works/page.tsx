import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ClipboardList,
  CreditCard,
  Stethoscope,
  FileCheck,
  MessageSquare,
  ArrowRight,
  Clock,
  Shield,
  Smartphone,
} from 'lucide-react'

export const metadata = {
  title: 'How It Works | InstantMed',
  description: 'Learn how InstantMed telehealth consultations work - from questionnaire to prescription in under an hour.',
}

const steps = [
  {
    number: 1,
    icon: ClipboardList,
    title: 'Complete a Quick Questionnaire',
    duration: '2-3 minutes',
    description: 'Answer questions about your health and what you need help with. Our smart questionnaire adapts based on your answers to collect only what\'s relevant.',
    details: [
      'Select your service type',
      'Answer health screening questions',
      'Provide relevant medical history',
      'Upload ID if required',
    ],
  },
  {
    number: 2,
    icon: CreditCard,
    title: 'Review & Pay',
    duration: '1 minute',
    description: 'Review your request summary and complete payment. Your card is only charged when you submit. Full refund if declined.',
    details: [
      'Clear pricing upfront',
      'Secure payment processing',
      'Priority option available (+$20)',
      'Full refund if not approved',
    ],
  },
  {
    number: 3,
    icon: Stethoscope,
    title: 'Doctor Reviews Your Request',
    duration: 'Within 1 hour',
    description: 'An Australian-registered doctor reviews your information and makes a clinical decision. This is a real consultation, not an automated approval.',
    details: [
      'AHPRA-registered doctors',
      'Individual clinical assessment',
      'May ask follow-up questions',
      'Priority gets 30-minute response',
    ],
  },
  {
    number: 4,
    icon: FileCheck,
    title: 'Receive Your Result',
    duration: 'Instant delivery',
    description: 'If approved, your prescription is sent via eScript to your phone, or your certificate is delivered to your email. Ready to use immediately.',
    details: [
      'eScripts sent via SMS/email',
      'Certificates as PDF download',
      'Use at any pharmacy',
      'Access from your dashboard',
    ],
  },
  {
    number: 5,
    icon: MessageSquare,
    title: 'Follow-Up Support',
    duration: 'As needed',
    description: 'Have questions after your consultation? Message your doctor directly through our secure platform. Follow-up support is included.',
    details: [
      'Message your doctor',
      'Ask follow-up questions',
      'Report any concerns',
      'Ongoing care for programs',
    ],
  },
]

export default function HowItWorksPage() {
  return (
    <div className="py-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">How InstantMed Works</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From start to finish in under 5 minutes of your time. 
            Get a response from a doctor within 1 hour.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8 mb-16">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-border hidden md:block" />
                )}

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex gap-6">
                      {/* Step number */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                          {step.number}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold">{step.title}</h3>
                          </div>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {step.duration}
                          </span>
                        </div>

                        <p className="text-muted-foreground mt-2">{step.description}</p>

                        <ul className="mt-4 grid sm:grid-cols-2 gap-2">
                          {step.details.map((detail, i) => (
                            <li key={i} className="text-sm flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>

        {/* Benefits */}
        <div className="grid sm:grid-cols-3 gap-6 mb-16">
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">1-Hour Response</h3>
            <p className="text-sm text-muted-foreground">
              Guaranteed response within 60 minutes, or your money back.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Real Doctors</h3>
            <p className="text-sm text-muted-foreground">
              Every consultation reviewed by AHPRA-registered doctors.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">100% Online</h3>
            <p className="text-sm text-muted-foreground">
              No video calls or appointments. Complete from your device.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-primary text-primary-foreground rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-primary-foreground/80 mb-6">
            Complete your consultation in under 5 minutes.
          </p>
          <Button size="lg" variant="secondary" asChild>
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
