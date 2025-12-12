import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Eligibility | InstantMed',
  description: 'Check if you\'re eligible for InstantMed telehealth services.',
}

export default function EligibilityPage() {
  return (
    <div className="py-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Eligibility Requirements</h1>
          <p className="text-muted-foreground text-lg">
            Check if InstantMed is right for you before starting your consultation.
          </p>
        </div>

        {/* General Requirements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>General Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              To use InstantMed services, you must meet all of the following criteria:
            </p>
            <div className="space-y-4">
              <RequirementItem
                met
                text="Be 18 years of age or older"
              />
              <RequirementItem
                met
                text="Be an Australian resident with a valid Australian address"
              />
              <RequirementItem
                met
                text="Have a valid email address and phone number"
              />
              <RequirementItem
                met
                text="Be able to read and understand English"
              />
              <RequirementItem
                met
                text="Not be experiencing a medical emergency"
              />
            </div>
          </CardContent>
        </Card>

        {/* Service-Specific Requirements */}
        <h2 className="text-2xl font-bold mb-6">Service-Specific Requirements</h2>

        <div className="space-y-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weight Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RequirementItem met text="BMI of 30 or greater" />
              <RequirementItem met text="OR BMI of 27+ with weight-related health condition (e.g., type 2 diabetes, high blood pressure)" />
              <RequirementItem met text="Not pregnant or breastfeeding" />
              <RequirementItem met text="No history of thyroid cancer or MEN2 syndrome" />
              <RequirementItem met text="No history of pancreatitis or gallbladder disease" />
              <p className="text-sm text-muted-foreground mt-4">
                Your BMI will be calculated based on your height and weight. 
                Additional health information may be required.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Men's Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RequirementItem met text="Be male and 18 years or older" />
              <RequirementItem met text="No recent heart attack, stroke, or cardiac procedure" />
              <RequirementItem met text="Not currently taking nitrate medications" />
              <RequirementItem met text="Blood pressure must be controlled if hypertensive" />
              <p className="text-sm text-muted-foreground mt-4">
                Some conditions require additional assessment. Your doctor will 
                advise if in-person consultation is needed.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Medical Certificates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RequirementItem met text="Genuine illness or injury preventing work/study" />
              <RequirementItem met text="Certificate required for 1-3 days (longer periods may require in-person assessment)" />
              <RequirementItem unmet text="Not for workers' compensation claims" />
              <RequirementItem unmet text="Not for pre-employment medical clearance" />
              <p className="text-sm text-muted-foreground mt-4">
                We issue certificates based on symptoms you report. Certificates 
                for extended periods may require additional information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Script Renewals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RequirementItem met text="Previously prescribed the medication by an Australian doctor" />
              <RequirementItem met text="Stable on current medication (no recent changes)" />
              <RequirementItem met text="Up to date with any required monitoring (e.g., blood tests)" />
              <RequirementItem unmet text="Schedule 8 (controlled) substances not available" />
              <RequirementItem unmet text="Not for new medications you haven't taken before" />
            </CardContent>
          </Card>
        </div>

        {/* What We Cannot Help With */}
        <Alert variant="destructive" className="mb-12">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>We Cannot Help With</AlertTitle>
          <AlertDescription>
            <ul className="mt-3 space-y-2 text-sm">
              <li>• Medical emergencies — call 000</li>
              <li>• Mental health crises or suicidal thoughts — call Lifeline 13 11 14</li>
              <li>• Schedule 8 (controlled) medications</li>
              <li>• Conditions requiring physical examination</li>
              <li>• Workers' compensation or insurance claims</li>
              <li>• Children under 18 years of age</li>
              <li>• Patients outside Australia</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* CTA */}
        <div className="text-center p-8 bg-muted/50 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Meet the requirements?</h3>
          <p className="text-muted-foreground mb-4">
            Start your consultation now. Our questionnaire will verify your eligibility.
          </p>
          <Button size="lg" asChild>
            <Link href="/start">
              Check Eligibility & Start
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function RequirementItem({ met = true, unmet = false, text }: { met?: boolean; unmet?: boolean; text: string }) {
  if (unmet) {
    return (
      <div className="flex items-start gap-3">
        <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <span className="text-muted-foreground">{text}</span>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
      <span>{text}</span>
    </div>
  )
}
