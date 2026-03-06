import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CONTACT_EMAIL, PRICING_DISPLAY } from "@/lib/constants"

export const metadata = {
  title: "Refund Policy",
  description: "InstantMed's refund policy for medical certificates, prescriptions, and telehealth consultations.",
}

export const revalidate = 86400

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-hero pt-32 pb-20 px-4">
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-8 -ml-2 rounded-lg">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="glass-card rounded-2xl p-8 sm:p-12">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Refund Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                InstantMed is committed to fair and transparent pricing. Payment is collected at the time you submit
                your request. If your request cannot be fulfilled, we provide a full refund. This policy outlines
                when refunds apply and how they are processed.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">When You Are Eligible for a Refund</h2>
              <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                <li>
                  <strong>Request declined by a doctor</strong> &mdash; If a doctor determines your request is not
                  appropriate for telehealth or requires an in-person examination, you will receive an automatic full
                  refund. This applies to medical certificates (from {PRICING_DISPLAY.MED_CERT}) and prescriptions
                  ({PRICING_DISPLAY.REPEAT_SCRIPT}).
                </li>
                <li>
                  <strong>Cancellation before review</strong> &mdash; If you cancel your request before a doctor
                  begins reviewing it, you will receive a full refund.
                </li>
                <li>
                  <strong>Review not completed within 24 hours</strong> &mdash; If a doctor is unable to review
                  your request within 24 hours of submission, you may request a full refund.
                </li>
                <li>
                  <strong>Technical issues</strong> &mdash; If a system error prevents delivery of your medical
                  certificate, prescription, or consultation outcome, you are entitled to a full refund.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">When Refunds Do Not Apply</h2>
              <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                <li>
                  <strong>Approved requests</strong> &mdash; Once a doctor has approved your request and delivered
                  your medical certificate or prescription, a refund is not available. The service has been provided.
                </li>
                <li>
                  <strong>Consultations</strong> &mdash; Telehealth consultations are non-refundable once a doctor
                  has reviewed your information and provided clinical advice, regardless of the clinical outcome.
                </li>
                <li>
                  <strong>Inaccurate information</strong> &mdash; If a request is declined because you provided
                  inaccurate or incomplete health information, the standard refund policy still applies (you will
                  receive a refund), but repeated misuse may result in account restrictions.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">How Refunds Are Processed</h2>
              <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                <li>
                  Eligible refunds are processed automatically when a doctor declines your request. No action is
                  required on your part.
                </li>
                <li>
                  Refunds are returned to your original payment method (the card or account used at checkout).
                </li>
                <li>
                  Refunds typically appear within <strong>3&ndash;5 business days</strong>, though your bank may take
                  longer to process.
                </li>
                <li>
                  You will receive an email confirmation when your refund has been issued.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Requesting a Refund</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Most refunds are issued automatically. If you believe you are entitled to a refund that has not been
                processed, or if you have questions about a charge, please contact us:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  Email:{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li>Include your name, email address, and the date of your request</li>
                <li>We aim to respond to refund enquiries within 2 business days</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Disputes</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you are not satisfied with the outcome of a refund request, you may lodge a formal complaint
                at{" "}
                <a href="mailto:complaints@instantmed.com.au" className="text-primary hover:underline">
                  complaints@instantmed.com.au
                </a>
                . We will respond within 14 business days. You may also contact your bank or payment provider to
                dispute a charge, or escalate to the relevant state health complaints commissioner.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Related Policies</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <Link href="/terms#fees" className="text-primary hover:underline">
                    Terms of Service &mdash; Fees, Payment, and Refunds
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
