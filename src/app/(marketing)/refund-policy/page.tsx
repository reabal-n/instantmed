import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Refund Policy | InstantMed',
  description: 'Our refund policy - full refund if your request is declined.',
}

export default function RefundPolicyPage() {
  return (
    <div className="py-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Refund Policy</h1>
          <p className="text-muted-foreground text-lg">
            We want you to feel confident using InstantMed. If we can't help, you don't pay.
          </p>
        </div>

        {/* Key Promise */}
        <Card className="mb-12 border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Our Promise</h2>
                <p className="text-lg">
                  If our doctor declines your request because telehealth isn't suitable 
                  for your situation, you'll receive a <strong>full refund</strong>. 
                  No questions asked.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* When You Get a Refund */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                When You Get a Refund
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <span>Your request is declined by our doctor</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <span>We fail to respond within the guaranteed timeframe (1 hour standard, 30 minutes priority)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <span>Technical issues on our end prevent completion</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  <span>Duplicate charge by mistake</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />
                When Refunds Don't Apply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                  <span>Your request is approved (even if you don't use it)</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                  <span>You change your mind after submitting</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                  <span>You provided false or misleading information</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                  <span>The pharmacy doesn't have stock (prescription still valid)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Process */}
        <h2 className="text-2xl font-bold mb-6">How Refunds Work</h2>
        
        <div className="space-y-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Automatic Processing</h3>
              <p className="text-muted-foreground">
                When our doctor declines your request, a refund is automatically initiated. 
                You don't need to do anything.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Processing Time</h3>
              <p className="text-muted-foreground">
                Refunds are processed within 24 hours. Depending on your bank, it may take 
                3-5 business days to appear in your account.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Confirmation</h3>
              <p className="text-muted-foreground">
                You'll receive an email confirmation when your refund is processed, 
                along with feedback from the doctor on why telehealth wasn't suitable.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <h2 className="text-2xl font-bold mb-6">Common Questions</h2>

        <div className="space-y-6 mb-12">
          <div>
            <h3 className="font-semibold mb-2">What if I paid for Priority but didn't get a 30-minute response?</h3>
            <p className="text-muted-foreground">
              You'll receive a refund of the $20 Priority fee. The base consultation fee is 
              still charged if your request was eventually approved.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Can I get a partial refund?</h3>
            <p className="text-muted-foreground">
              No. Refunds are always for the full amount paid. We don't offer partial refunds.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">What if my prescription didn't work for me?</h3>
            <p className="text-muted-foreground">
              Once a prescription is approved and issued, we cannot offer refunds. However, 
              you can message your doctor to discuss alternatives or adjustments.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">I haven't received my refund after 5 business days</h3>
            <p className="text-muted-foreground">
              Please contact us at{' '}
              <a href="mailto:support@instantmed.com.au" className="text-primary hover:underline">
                support@instantmed.com.au
              </a>
              {' '}with your reference number, and we'll investigate immediately.
            </p>
          </div>
        </div>

        {/* Contact */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-muted-foreground mb-4">
              If you have questions about a refund or believe you're entitled to one, 
              please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" asChild>
                <a href="mailto:support@instantmed.com.au">Email Support</a>
              </Button>
              <Button asChild>
                <Link href="/start">
                  Start Consultation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Last Updated */}
        <p className="text-sm text-muted-foreground text-center mt-8">
          Last updated: December 2024
        </p>
      </div>
    </div>
  )
}
