import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Terms of Service | InstantMed",
  description: "Terms and conditions for using InstantMed telehealth services.",
}

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 2025</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using InstantMed&apos;s services, you agree to be bound by these Terms of Service. If you do
                not agree to these terms, please do not use our services. We reserve the right to modify these terms at
                any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">To use InstantMed, you must:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Be at least 18 years of age (or have parental/guardian consent)</li>
                <li>Be located in Australia at the time of consultation</li>
                <li>Provide accurate and complete information</li>
                <li>Have a valid email address and phone number</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Nature of Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                InstantMed provides online telehealth consultations for non-emergency medical needs. Our services
                are not a substitute for emergency care. If you are experiencing a medical emergency, call 000
                immediately or go to your nearest emergency department.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Medical Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our doctors make clinical decisions based on the information you provide. You are responsible for
                providing accurate and complete health information. Not all requests can be approved — our doctors may
                decline requests if they determine that a face-to-face consultation or further investigation is
                required.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Fees and Payment</h2>
              <p className="text-muted-foreground leading-relaxed">
                Service fees are displayed before you submit a request. Payment is required at the time of submission.
                Fees are non-refundable once a doctor has reviewed your request, regardless of the outcome. Some
                services may be eligible for Medicare rebates.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Prescriptions</h2>
              <p className="text-muted-foreground leading-relaxed">
                Prescriptions are issued at the sole discretion of the treating doctor. We do not prescribe certain
                medications including Schedule 8 drugs, benzodiazepines, or other controlled substances. Electronic
                prescriptions are sent via SMS or email and can be dispensed at any pharmacy in Australia.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Telehealth Consent</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                By using InstantMed, you consent to receiving healthcare services via telehealth (online 
                consultation). You understand and agree that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  Consultations are primarily conducted asynchronously (text-based) without video or phone calls, 
                  unless the doctor determines otherwise
                </li>
                <li>
                  A doctor may request a phone or video consultation if clinically necessary
                </li>
                <li>
                  Electronic prescriptions and medical certificates are delivered via email or SMS
                </li>
                <li>
                  Your health information is stored securely and may be accessed by treating clinicians
                </li>
                <li>
                  Telehealth has limitations and some conditions require in-person examination
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, InstantMed shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages arising from your use of our services. Our total liability
                shall not exceed the amount paid by you for the specific service giving rise to the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these terms, please contact us at{" "}
                <a href="mailto:legal@instantmed.com.au" className="text-[#2563EB] hover:underline">
                  legal@instantmed.com.au
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
