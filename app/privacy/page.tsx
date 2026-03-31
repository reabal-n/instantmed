import type { Metadata } from "next"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"
import { CenteredHero } from "@/components/heroes"
import { CTABanner } from "@/components/sections"
import { LegalSection } from "@/components/shared/legal-section"
import { CONTACT_EMAIL_PRIVACY, CONTACT_PHONE } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How InstantMed collects, uses, and protects your personal and health information.",
  alternates: { canonical: "https://instantmed.com.au/privacy" },
  openGraph: {
    title: "Privacy Policy | InstantMed",
    description: "How InstantMed collects, uses, and protects your personal and health information.",
    url: "https://instantmed.com.au/privacy",
  },
}

export const revalidate = 86400

export default function PrivacyPage() {
  return (
    <MarketingPageShell>
      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1">
          <CenteredHero
            pill="Legal"
            title="Privacy Policy"
            subtitle="Last updated: February 2026"
          />

          {/* Content card */}
          <section className="pb-24 px-4">
            <div className="mx-auto max-w-3xl">
              <div className="bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] p-8 sm:p-12 divide-y divide-border/40">

                <LegalSection number="1" title="Introduction">
                  <p>
                    InstantMed (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy and
                    complying with the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).
                    This policy explains how we collect, use, disclose, and protect your personal and health
                    information.
                  </p>
                </LegalSection>

                <LegalSection number="2" title="Information We Collect">
                  <p>We collect the following types of information:</p>
                  <ul>
                    <li>
                      <strong>Identity Information:</strong> Full name, date of birth, email address, phone
                      number
                    </li>
                    <li>
                      <strong>Medicare Information:</strong> Medicare number, IRN, and expiry date (for
                      eligible services)
                    </li>
                    <li>
                      <strong>Address Information:</strong> Residential address for delivery of prescriptions
                    </li>
                    <li>
                      <strong>Health Information:</strong> Medical history, current medications, symptoms,
                      allergies, and other health-related information you provide
                    </li>
                    <li>
                      <strong>Usage Information:</strong> How you interact with our platform, including pages
                      visited and features used
                    </li>
                  </ul>
                </LegalSection>

                <LegalSection number="3" title="How We Use Your Information">
                  <p>We use your information to:</p>
                  <ul>
                    <li>Provide telehealth consultations and medical services</li>
                    <li>Process prescriptions, medical certificates, and referrals</li>
                    <li>Communicate with you about your care</li>
                    <li>Comply with legal and regulatory requirements</li>
                    <li>Improve our services and user experience</li>
                    <li>Prevent fraud and ensure platform security</li>
                  </ul>
                </LegalSection>

                <LegalSection number="4" title="AI-Assisted Documentation" id="ai">
                  <p>
                    InstantMed uses Anthropic (Claude) to assist with certain administrative tasks, including
                    summarizing intake information for doctor review and drafting documents such as medical
                    certificates. All AI-generated content is reviewed and approved by a registered Australian
                    doctor before being sent to you.
                  </p>
                  <p>
                    AI assistance does not extend to clinical decision-making. Doctors make all medical
                    decisions independently. Health information shared during intake may be processed by
                    Anthropic&apos;s systems in accordance with their data processing agreements with us.
                  </p>
                </LegalSection>

                <LegalSection number="5" title="Third-Party Service Providers">
                  <p>
                    We share your information with trusted third parties only where necessary to deliver our
                    services:
                  </p>
                  <ul>
                    <li>
                      <strong>Supabase:</strong> Database hosting and storage
                    </li>
                    <li>
                      <strong>Clerk:</strong> Authentication and identity management
                    </li>
                    <li>
                      <strong>Stripe:</strong> Payment processing (no card data stored by InstantMed)
                    </li>
                    <li>
                      <strong>Resend:</strong> Transactional email delivery
                    </li>
                    <li>
                      <strong>Anthropic (Claude):</strong> AI-assisted documentation drafting
                    </li>
                    <li>
                      <strong>Parchment:</strong> Electronic prescription generation
                    </li>
                    <li>
                      <strong>PostHog:</strong> Product analytics (anonymised usage data)
                    </li>
                    <li>
                      <strong>Sentry:</strong> Error monitoring (no PHI in error reports)
                    </li>
                  </ul>
                  <p>
                    All providers are contractually bound to use your data only for the purposes we specify
                    and to maintain appropriate security standards.
                  </p>
                </LegalSection>

                <LegalSection number="6" title="Health Information">
                  <p>
                    Health information is sensitive personal information under the Privacy Act 1988 (Cth). We
                    handle your health information with the highest level of care and in accordance with the
                    Australian Privacy Principles. Your health information is:
                  </p>
                  <ul>
                    <li>Encrypted at rest using AES-256-GCM field-level encryption</li>
                    <li>Transmitted over TLS-encrypted connections only</li>
                    <li>Accessible only to treating clinicians and authorised staff</li>
                    <li>Never sold or shared for marketing purposes</li>
                    <li>Retained for a minimum of 7 years as required by law</li>
                  </ul>
                </LegalSection>

                <LegalSection number="7" title="Data Security">
                  <p>
                    We implement industry-standard technical and organisational measures to protect your
                    information against unauthorised access, disclosure, alteration, or destruction. These
                    measures include:
                  </p>
                  <ul>
                    <li>AES-256-GCM field-level encryption for all health (PHI) data</li>
                    <li>TLS encryption for all data in transit</li>
                    <li>Role-based access controls — data is only accessible to authorised personnel</li>
                    <li>Row-level security enforced at the database layer</li>
                    <li>Regular security assessments and internal audits</li>
                  </ul>
                </LegalSection>

                <LegalSection number="8" title="Your Rights">
                  <p>Under the Australian Privacy Principles, you have the right to:</p>
                  <ul>
                    <li>Access the personal information we hold about you</li>
                    <li>Request correction of inaccurate or incomplete information</li>
                    <li>Request deletion of your account (subject to legal retention requirements)</li>
                    <li>Opt out of non-essential communications</li>
                    <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
                  </ul>
                  <p>
                    To exercise any of these rights, contact us at{" "}
                    <a href={`mailto:${CONTACT_EMAIL_PRIVACY}`} className="text-primary hover:underline">
                      {CONTACT_EMAIL_PRIVACY}
                    </a>
                    . We will respond within 30 days.
                  </p>
                </LegalSection>

                <LegalSection number="9" title="Cookies and Analytics">
                  <p>
                    We use cookies and similar tracking technologies to improve your experience and understand
                    how our platform is used. This includes:
                  </p>
                  <ul>
                    <li>
                      <strong>Essential cookies:</strong> Required for authentication and platform
                      functionality
                    </li>
                    <li>
                      <strong>Analytics:</strong> PostHog collects anonymised usage data to help us improve
                      our services
                    </li>
                    <li>
                      <strong>Error monitoring:</strong> Sentry captures technical error information (no
                      health data included)
                    </li>
                  </ul>
                  <p>
                    You can control cookie preferences through your browser settings. Disabling essential
                    cookies may affect platform functionality.
                  </p>
                </LegalSection>

                <LegalSection number="10" title="Data Retention">
                  <p>
                    We retain your personal information for as long as necessary to provide our services and
                    comply with legal obligations:
                  </p>
                  <ul>
                    <li>Health records: minimum 7 years from last consultation (as required by law)</li>
                    <li>Account data: until you request deletion (subject to health record retention)</li>
                    <li>Payment records: 7 years (as required by Australian tax law)</li>
                    <li>Analytics data: anonymised and retained indefinitely for service improvement</li>
                  </ul>
                </LegalSection>

                <LegalSection number="11" title="Children's Privacy">
                  <p>
                    Our services are intended for individuals aged 18 and over. We do not knowingly collect
                    personal information from individuals under 18 without verified parental or guardian
                    consent. If you believe a minor has provided us with personal information without
                    appropriate consent, please contact us immediately.
                  </p>
                </LegalSection>

                <LegalSection number="12" title="Data Breach Notification">
                  <p>
                    In the event of a data breach that is likely to result in serious harm, we will notify
                    affected individuals and the Office of the Australian Information Commissioner (OAIC) as
                    required under the Notifiable Data Breaches (NDB) scheme within 30 days of becoming aware
                    of the breach.
                  </p>
                </LegalSection>

                <LegalSection number="13" title="Contact Us">
                  <p>
                    For questions, requests, or complaints about this Privacy Policy or how we handle your
                    information, please contact our Privacy Officer:
                  </p>
                  <ul>
                    <li>
                      <strong>Email:</strong>{" "}
                      <a href={`mailto:${CONTACT_EMAIL_PRIVACY}`} className="text-primary hover:underline">
                        {CONTACT_EMAIL_PRIVACY}
                      </a>
                    </li>
                    <li>
                      <strong>Phone:</strong>{" "}
                      <a href={`tel:${CONTACT_PHONE}`} className="text-primary hover:underline">
                        {CONTACT_PHONE}
                      </a>
                    </li>
                    <li>
                      <strong>Address:</strong> Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010
                    </li>
                  </ul>
                  <p>
                    If you are not satisfied with our response, you may lodge a complaint with the Office of
                    the Australian Information Commissioner (OAIC) at{" "}
                    <a
                      href="https://www.oaic.gov.au"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      oaic.gov.au
                    </a>
                    .
                  </p>
                </LegalSection>

              </div>
            </div>
          </section>
        </main>

        <CTABanner
          title="Questions about your privacy?"
          subtitle="Your data belongs to you. If you have concerns, we want to hear about them."
          ctaText="Contact us"
          ctaHref="/contact"
        />

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
