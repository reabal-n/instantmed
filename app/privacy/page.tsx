import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Privacy Policy",
  description: "How InstantMed collects, uses, and protects your personal and health information.",
}

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                InstantMed (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy and complying with the Privacy
                Act 1988 (Cth) and the Australian Privacy Principles (APPs). This policy explains how we collect, use,
                disclose, and protect your personal and health information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect the following types of information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>Identity Information:</strong> Full name, date of birth, email address, phone number
                </li>
                <li>
                  <strong>Medicare Information:</strong> Medicare number, IRN, and expiry date (for eligible services)
                </li>
                <li>
                  <strong>Address Information:</strong> Residential address for delivery of prescriptions
                </li>
                <li>
                  <strong>Health Information:</strong> Medical history, current medications, symptoms, allergies, and
                  other health-related information you provide
                </li>
                <li>
                  <strong>Usage Information:</strong> How you interact with our platform, including pages visited and
                  features used
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Provide telehealth consultations and medical services</li>
                <li>Process prescriptions, medical certificates, and referrals</li>
                <li>Communicate with you about your care</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Improve our services and user experience</li>
                <li>Prevent fraud and ensure platform security</li>
              </ul>
            </section>

            <section className="mb-8" id="ai">
              <h2 className="text-xl font-semibold mb-4">4. AI-Assisted Documentation</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use artificial intelligence to assist with certain tasks:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>Summarizing your intake information for efficient doctor review</li>
                <li>Drafting documents such as medical certificates (always reviewed by a doctor)</li>
                <li>Improving the intake experience through smart suggestions</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>Important:</strong> AI does not make any clinical decisions. All medical decisions are made 
                by registered Australian doctors. AI-generated content is always reviewed and approved by a clinician 
                before being finalized.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Your health information may be processed by AI systems operated by third-party providers (such as OpenAI). 
                This processing may occur in the United States under appropriate data protection agreements. We only send 
                the minimum information necessary, and data is not used to train AI models.
              </p>
            </section>

            <section className="mb-8" id="third-parties">
              <h2 className="text-xl font-semibold mb-4">5. Third-Party Service Providers</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We share limited information with trusted service providers to deliver our services:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>
                  <strong>Stripe:</strong> Payment processing (card details, transaction amount). Your payment 
                  information is processed securely by Stripe and we never store your full card number.
                </li>
                <li>
                  <strong>Resend:</strong> Email delivery (email address, notification content such as appointment 
                  confirmations and certificate delivery).
                </li>
                <li>
                  <strong>Twilio:</strong> SMS delivery (phone number, message content such as eScript delivery).
                </li>
                <li>
                  <strong>OpenAI:</strong> AI-assisted documentation (de-identified health information summaries 
                  for intake processing).
                </li>
                <li>
                  <strong>Supabase:</strong> Database hosting (all data, stored in Australia).
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                These providers are contractually bound to protect your information and only use it to provide 
                services to us. We conduct due diligence on all providers to ensure they meet our security and 
                privacy standards.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Health Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your health information is treated with the highest level of confidentiality. We only collect health
                information that is necessary to provide you with medical services. This information is stored securely
                and is only accessible to authorised medical practitioners involved in your care. We comply with all
                applicable health records legislation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your information, including encryption in
                transit and at rest, secure cloud infrastructure hosted in Australia, regular security audits, and
                strict access controls. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information (subject to legal requirements)</li>
                <li>Withdraw consent for certain uses of your information</li>
                <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
              </ul>
            </section>

            <section className="mb-8" id="cookies">
              <h2 className="text-xl font-semibold mb-4">9. Cookies and Analytics</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use cookies and similar tracking technologies to improve your experience and analyse how our 
                platform is used. This helps us understand usage patterns and improve our services.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>Types of cookies we use:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                <li>
                  <strong>Essential cookies:</strong> Required for the platform to function (e.g., authentication, session management)
                </li>
                <li>
                  <strong>Analytics cookies:</strong> Help us understand how you use our platform
                </li>
                <li>
                  <strong>Marketing cookies:</strong> Used to measure the effectiveness of our advertising
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>Third-party services we use:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong>PostHog:</strong> Product analytics to understand platform usage and improve user experience. 
                  When you&apos;re signed in, we associate your activity with your account to provide better support.
                </li>
                <li>
                  <strong>Vercel Analytics:</strong> Performance monitoring to ensure fast page loads
                </li>
                <li>
                  <strong>Google Analytics:</strong> Marketing attribution to measure advertising effectiveness
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You can manage cookie preferences through your browser settings. Note that disabling certain 
                cookies may affect platform functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as necessary to provide our services and comply 
                with legal obligations. Health records are retained in accordance with Australian health records 
                legislation (typically 7 years from the date of last service, or until you turn 25 if you were 
                a child when treated). You may request deletion of your account data, subject to our legal 
                retention requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Children&apos;s Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our services are intended for users aged 18 and over. We do not knowingly collect personal information 
                from children under 18 without parental or guardian consent. If a parent or guardian provides consent 
                for a minor to use our services, the parent or guardian is responsible for supervising the minor&apos;s 
                use and ensuring the accuracy of information provided. If you believe we have collected information 
                from a child without appropriate consent, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Data Breach Notification</h2>
              <p className="text-muted-foreground leading-relaxed">
                In the event of a data breach that is likely to result in serious harm to you, we will notify you 
                and the Office of the Australian Information Commissioner (OAIC) as required under the Notifiable 
                Data Breaches scheme. We will provide you with information about the breach, the types of information 
                involved, and recommendations for steps you can take to protect yourself.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">13. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this privacy policy or wish to make a complaint, please contact us at{" "}
                <a href="mailto:privacy@instantmed.com.au" className="text-primary hover:underline">
                  privacy@instantmed.com.au
                </a>{" "}
                or call 1300 123 456.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
