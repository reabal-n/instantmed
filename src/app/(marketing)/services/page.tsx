import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ArrowRight, Clock, Scale, Heart, FileText, Pill, Stethoscope } from 'lucide-react'

export const metadata = {
  title: 'Our Services | InstantMed',
  description: 'Explore InstantMed telehealth services - weight management, men\'s health, medical certificates, and prescription renewals.',
}

const services = [
  {
    slug: 'weight-management',
    icon: Scale,
    name: 'Weight Management',
    shortDesc: 'Clinically-supervised weight loss programs',
    description: 'Our weight management program combines evidence-based treatments with ongoing medical supervision. Our doctors assess your eligibility, prescribe appropriate medications where suitable, and provide ongoing monitoring.',
    price: 79,
    includes: [
      'Initial doctor consultation',
      'Health assessment & eligibility check',
      'Medication prescription (if appropriate)',
      'Monthly check-in consultations',
      'Messaging support with your doctor',
      'Treatment plan adjustments',
    ],
    requirements: [
      'BMI of 30+ or BMI 27+ with related conditions',
      'Not pregnant or breastfeeding',
      'No contraindicated health conditions',
    ],
    timing: 'Initial consultation within 1 hour',
    popular: true,
  },
  {
    slug: 'mens-health',
    icon: Heart,
    name: "Men's Health",
    shortDesc: 'Discreet consultations for sensitive concerns',
    description: 'Get confidential, judgement-free consultations for common men\'s health concerns. Our doctors understand these topics can be sensitive, and we\'ve designed our service to be as comfortable as possible.',
    price: 49,
    includes: [
      'Private doctor consultation',
      'Health & safety assessment',
      'Treatment options explained',
      'Prescription if clinically appropriate',
      'Follow-up support included',
    ],
    requirements: [
      'Male, 18 years or older',
      'No recent cardiac events',
      'Not taking nitrate medications',
    ],
    timing: 'Response within 1 hour',
    popular: true,
  },
  {
    slug: 'medical-certificates',
    icon: FileText,
    name: 'Medical Certificates',
    shortDesc: 'Sick leave certificates for work or study',
    description: 'Need a medical certificate for a sick day? Skip the waiting room. Describe your symptoms, and if appropriate, receive a valid medical certificate delivered straight to your inbox.',
    price: 29,
    includes: [
      'Doctor review of symptoms',
      'Medical certificate (PDF)',
      'Valid for employers & universities',
      'Coverage up to 3 days',
    ],
    requirements: [
      'Genuine illness or injury',
      'Not for workers\' compensation',
      'Not for pre-employment medicals',
    ],
    timing: 'Certificate issued within 1 hour',
    popular: false,
  },
  {
    slug: 'prescriptions',
    icon: Pill,
    name: 'Prescription Renewals',
    shortDesc: 'Renew existing prescriptions',
    description: 'Running low on a medication you\'re already taking? Get your script renewed without visiting a clinic. Our doctors can renew prescriptions for stable, ongoing medications.',
    price: 39,
    includes: [
      'Doctor consultation',
      'Medication review',
      'eScript sent to your phone',
      'Use at any pharmacy',
    ],
    requirements: [
      'Previously prescribed the medication',
      'Stable on current treatment',
      'Not for Schedule 8 medications',
    ],
    timing: 'eScript within 1 hour',
    popular: false,
  },
]

export default function ServicesPage() {
  return (
    <div className="py-16">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Our Services</h1>
          <p className="text-muted-foreground text-lg">
            Quick, convenient healthcare for common conditions. 
            All consultations reviewed by Australian-registered doctors.
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {services.map((service) => {
            const Icon = service.icon
            return (
              <Card key={service.slug} className={service.popular ? 'border-primary' : ''}>
                {service.popular && (
                  <div className="px-6 pt-4">
                    <Badge>Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{service.name}</CardTitle>
                      <CardDescription className="mt-1">{service.shortDesc}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground">{service.description}</p>

                  {/* What's Included */}
                  <div>
                    <h4 className="font-medium mb-3">What's Included</h4>
                    <ul className="space-y-2">
                      {service.includes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Requirements */}
                  <div>
                    <h4 className="font-medium mb-3">Requirements</h4>
                    <ul className="space-y-1">
                      {service.requirements.map((req, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <span className="text-2xl font-bold">${service.price}</span>
                      <span className="text-muted-foreground ml-1">AUD</span>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {service.timing}
                      </p>
                    </div>
                    <Button asChild>
                      <Link href="/start">
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Coming Soon */}
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <Stethoscope className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">More Services Coming Soon</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're expanding our services to help with more common health needs. 
            Sign up to be notified when new services launch.
          </p>
        </div>
      </div>
    </div>
  )
}
