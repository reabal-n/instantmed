import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, Phone, ArrowRight, Info } from 'lucide-react'

export const metadata = {
  title: 'Service Limitations | InstantMed',
  description: 'Important limitations of InstantMed telehealth services.',
}

export default function LimitationsPage() {
  return (
    <div className="py-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Service Limitations</h1>
          <p className="text-muted-foreground text-lg">
            Telehealth is convenient, but it's not suitable for everything. 
            Here's what we can and cannot do.
          </p>
        </div>

        {/* Emergency Warning */}
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Medical Emergencies</AlertTitle>
          <AlertDescription>
            <p className="mb-3">
              InstantMed is NOT for emergencies. If you're experiencing any of the following, 
              call 000 immediately:
            </p>
            <ul className="space-y-1 text-sm">
              <li>• Chest pain or difficulty breathing</li>
              <li>• Signs of stroke (facial drooping, arm weakness, speech difficulty)</li>
              <li>• Severe allergic reaction</li>
              <li>• Heavy bleeding or serious injury</li>
              <li>• Loss of consciousness</li>
              <li>• Thoughts of self-harm or suicide</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Mental Health Notice */}
        <Card className="mb-8 border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Phone className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Mental Health Crisis Support</h3>
                <p className="text-muted-foreground mb-3">
                  If you're in crisis or need mental health support, please contact:
                </p>
                <ul className="space-y-2 text-sm">
                  <li><strong>Lifeline:</strong> 13 11 14 (24/7)</li>
                  <li><strong>Beyond Blue:</strong> 1300 22 4636</li>
                  <li><strong>Suicide Call Back Service:</strong> 1300 659 467</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What We Cannot Do */}
        <h2 className="text-2xl font-bold mb-6">What We Cannot Do</h2>

        <div className="space-y-6 mb-12">
          <LimitationCard
            title="Physical Examination"
            description="Some conditions require hands-on examination that cannot be done remotely."
            examples={[
              'Skin conditions requiring close inspection',
              'Ear infections (need otoscope)',
              'Abdominal pain requiring palpation',
              'Joint or muscle injuries needing physical assessment',
            ]}
          />

          <LimitationCard
            title="Controlled Substances"
            description="We cannot prescribe Schedule 8 medications under any circumstances."
            examples={[
              'Opioid pain medications',
              'Stimulant medications (e.g., for ADHD)',
              'Strong sedatives and sleeping pills',
              'Medical cannabis',
            ]}
          />

          <LimitationCard
            title="Complex Chronic Conditions"
            description="Some ongoing conditions require regular in-person care and monitoring."
            examples={[
              'Newly diagnosed diabetes (initial management)',
              'Complex heart conditions',
              'Conditions requiring regular blood tests',
              'Multiple interacting conditions',
            ]}
          />

          <LimitationCard
            title="Legal & Insurance Documentation"
            description="We cannot provide documentation for legal or insurance purposes."
            examples={[
              'Workers\' compensation claims',
              'Pre-employment medical clearance',
              'Insurance claim assessments',
              'Disability support applications',
              'Court or legal proceedings',
            ]}
          />

          <LimitationCard
            title="Children & Special Populations"
            description="Our service is designed for adults only."
            examples={[
              'Patients under 18 years old',
              'Patients outside Australia',
              'Patients unable to consent for themselves',
            ]}
          />
        </div>

        {/* What Happens If */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              What Happens If You're Not Suitable?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              If our doctor determines that telehealth isn't appropriate for your situation:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">1.</span>
                <span>You'll receive a <strong>full refund</strong> of your consultation fee</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">2.</span>
                <span>The doctor will explain why telehealth isn't suitable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-primary">3.</span>
                <span>You'll receive guidance on recommended next steps (e.g., see your GP, visit ED)</span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              We decline approximately 5% of requests to ensure patient safety. 
              This is a feature, not a bug — it means we're practicing responsible medicine.
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Understand the limitations?</h3>
          <p className="text-muted-foreground mb-4">
            If your condition is suitable for telehealth, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link href="/eligibility">Check Eligibility</Link>
            </Button>
            <Button asChild>
              <Link href="/start">
                Start Consultation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LimitationCard({
  title,
  description,
  examples,
}: {
  title: string
  description: string
  examples: string[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{description}</p>
        <ul className="space-y-1 text-sm">
          {examples.map((example, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{example}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
