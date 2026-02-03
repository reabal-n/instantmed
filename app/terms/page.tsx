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
          <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

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

            <section className="mb-8" id="fees">
              <h2 className="text-xl font-semibold mb-4">5. Fees, Payment, and Refunds</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Service fees are displayed before you submit a request. Payment is required at the time of submission.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-2 font-medium">Refund Policy:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>
                  If your request is <strong>declined</strong> for clinical reasons (e.g., not appropriate for 
                  telehealth, requires in-person examination), you will receive a full refund within 3-5 business days.
                </li>
                <li>
                  If your request is <strong>approved</strong>, no refund is available.
                </li>
                <li>
                  If you <strong>cancel</strong> your request before a doctor reviews it, you will receive a full refund.
                </li>
                <li>
                  If a doctor is unable to review your request within 24 hours, you may request a full refund.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                Some services may be eligible for Medicare rebates — this will be indicated during checkout.
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

            <section className="mb-8" id="ai">
              <h2 className="text-xl font-semibold mb-4">8. AI-Assisted Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                InstantMed uses artificial intelligence to assist with certain administrative tasks, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Summarizing your intake information for efficient doctor review</li>
                <li>Drafting documents such as medical certificates (always reviewed by a doctor)</li>
                <li>Improving the intake experience through smart suggestions</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Important:</strong> AI does not make any clinical decisions. All medical decisions are made 
                by registered Australian doctors. AI-generated content is always reviewed and approved by a clinician 
                before being finalized or sent to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Record Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                In accordance with Australian healthcare record-keeping requirements, we retain your health records 
                for a minimum of 7 years from the date of your last consultation. You may request access to your 
                records at any time by contacting us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Our service operates during business hours (8am–10pm AEST, 7 days a week). While we aim to review 
                most requests within 1-2 hours during these times, review times may vary depending on demand and 
                case complexity.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We do not guarantee specific response times. Our services are available to users located in Australia only.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, InstantMed shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages arising from your use of our services. Our total liability
                shall not exceed the amount paid by you for the specific service giving rise to the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have a complaint about our services, please contact us first at{" "}
                <a href="mailto:complaints@instantmed.com.au" className="text-primary hover:underline">
                  complaints@instantmed.com.au
                </a>
                . We will endeavour to resolve your complaint within 14 business days.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                If we cannot resolve your complaint to your satisfaction, you may lodge a complaint with the 
                Australian Health Practitioner Regulation Agency (AHPRA) or the relevant state health complaints 
                commissioner.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">13. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms of Service are governed by the laws of New South Wales, Australia. You agree to submit 
                to the exclusive jurisdiction of the courts of New South Wales for any disputes arising from these 
                terms or your use of our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">14. Account Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account if you violate these terms, provide false 
                information, or misuse our services. You may request account deletion at any time by contacting us. 
                Note that health records must be retained as per Section 9, even after account deletion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">15. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these terms, please contact us at{" "}
                <a href="mailto:legal@instantmed.com.au" className="text-primary hover:underline">
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
