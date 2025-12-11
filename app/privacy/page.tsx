import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Privacy Policy | InstantMed",
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
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 2025</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                InstantMed ("we", "our", or "us") is committed to protecting your privacy and complying with the Privacy
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

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Health Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your health information is treated with the highest level of confidentiality. We only collect health
                information that is necessary to provide you with medical services. This information is stored securely
                and is only accessible to authorised medical practitioners involved in your care. We comply with all
                applicable health records legislation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your information, including encryption in
                transit and at rest, secure cloud infrastructure hosted in Australia, regular security audits, and
                strict access controls. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information (subject to legal requirements)</li>
                <li>Withdraw consent for certain uses of your information</li>
                <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this privacy policy or wish to make a complaint, please contact us at{" "}
                <a href="mailto:privacy@instantmed.com.au" className="text-[#00E2B5] hover:underline">
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
