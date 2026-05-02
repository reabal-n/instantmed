import type { Metadata } from "next"
import Link from "next/link"

import { CenteredHero } from "@/components/heroes"
import { MarketingFooter, MarketingPageShell } from "@/components/marketing"
import { CTABanner } from "@/components/sections"
import { Navbar } from "@/components/shared"
import { LegalSection } from "@/components/shared"
import { CONTACT_EMAIL_COMPLAINTS, CONTACT_EMAIL_LEGAL } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using InstantMed telehealth services.",
  alternates: { canonical: "https://instantmed.com.au/terms" },
  openGraph: {
    title: "Terms of Service | InstantMed",
    description: "Terms and conditions for using InstantMed telehealth services.",
    url: "https://instantmed.com.au/terms",
  },
}

export const revalidate = 86400

export default function TermsPage() {
  return (
    <MarketingPageShell>
      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1">
          <CenteredHero
            pill="Legal"
            title="Terms of Service"
            subtitle="Last updated: February 2026"
          />

          {/* Content card */}
          <section className="pb-24 px-4">
            <div className="mx-auto max-w-3xl">
              <div className="bg-white dark:bg-card rounded-2xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] p-8 sm:p-12 divide-y divide-border/40">

                {/* Table of contents */}
                <nav aria-label="Contents" className="pb-8">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contents</p>
                  <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 list-none">
                    {[
                      [1, "Acceptance of Terms"],
                      [2, "Eligibility"],
                      [3, "Nature of Services"],
                      [4, "Medical Disclaimer"],
                      [5, "Clinical Governance Model"],
                      [6, "Fees, Payment, and Refunds"],
                      [7, "Prescriptions"],
                      [8, "Telehealth Consent"],
                      [9, "AI-Assisted Services"],
                      [10, "Record Retention"],
                      [11, "Service Availability"],
                      [12, "Limitation of Liability"],
                      [13, "Dispute Resolution"],
                      [14, "Governing Law"],
                      [15, "Account Termination"],
                      [16, "Contact"],
                    ].map(([n, title]) => (
                      <li key={n}>
                        <a
                          href={`#section-${n}`}
                          className="flex items-baseline gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                        >
                          <span className="text-[10px] font-mono text-muted-foreground group-hover:text-primary/50 shrink-0 w-4">{n}.</span>
                          {title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>

                <LegalSection number="1" title="Acceptance of Terms">
                  <p>
                    By accessing or using InstantMed&apos;s services, you agree to be bound by these Terms of
                    Service. If you do not agree to these terms, please do not use our services. We reserve
                    the right to modify these terms at any time.
                  </p>
                </LegalSection>

                <LegalSection number="2" title="Eligibility">
                  <p>To use InstantMed, you must:</p>
                  <ul>
                    <li>Be at least 18 years of age (or have parental/guardian consent)</li>
                    <li>Be located in Australia at the time of consultation</li>
                    <li>Provide accurate and complete information</li>
                    <li>Have a valid email address and phone number</li>
                  </ul>
                </LegalSection>

                <LegalSection number="3" title="Nature of Services">
                  <p>
                    InstantMed provides online telehealth consultations for non-emergency medical needs. Our
                    services are not a substitute for emergency care. If you are experiencing a medical
                    emergency, call 000 immediately or go to your nearest emergency department.
                  </p>
                </LegalSection>

                <LegalSection number="4" title="Medical Disclaimer">
                  <p>
                    The reviewing AHPRA-registered doctor makes clinical decisions based on the information
                    you provide. You are responsible for providing accurate and complete health information.
                    Not all requests can be approved - the reviewing doctor may decline requests if they
                    determine that a face-to-face consultation or further investigation is required.
                  </p>
                </LegalSection>

                <LegalSection number="5" title="Clinical Governance Model" id="governance">
                  <p>
                    InstantMed currently operates with a single AHPRA-registered Australian GP who serves as
                    both the treating practitioner and the Medical Director. This is an honest disclosure of
                    scale. You are not being reviewed by an anonymous team behind a logo - you are being
                    reviewed by a named, registered, identifiable clinician whose AHPRA status you can verify
                    independently on the public register.
                  </p>
                  <p>
                    The Medical Director holds current, unrestricted AHPRA registration, maintains professional
                    indemnity insurance, and is subject to the same regulatory oversight and professional
                    obligations as any other registered GP in Australia. The treating practitioner&apos;s name
                    and AHPRA registration number are disclosed on every medical certificate and prescription
                    issued, and are available on request for any consultation via{" "}
                    <a href={`mailto:${CONTACT_EMAIL_COMPLAINTS}`}>{CONTACT_EMAIL_COMPLAINTS}</a>.
                  </p>
                  <p>
                    Our clinical governance framework, including protocol design, audit cadence, and scope
                    boundaries, is documented at{" "}
                    <Link href="/clinical-governance">/clinical-governance</Link>. The framework is designed
                    to scale as additional clinicians are onboarded.
                  </p>
                </LegalSection>

                <LegalSection number="6" title="Fees, Payment, and Refunds" id="fees">
                  <p>
                    Service fees are displayed before you submit a request. Payment is required at the time
                    of submission.
                  </p>
                  <p className="font-medium text-foreground/80 mt-3">Refund Policy:</p>
                  <ul>
                    <li>
                      If your request is <strong>declined</strong> for clinical reasons (e.g., not
                      appropriate for telehealth, requires in-person examination), you will receive a full
                      refund within 3–5 business days.
                    </li>
                    <li>
                      If your request is <strong>approved</strong>, no refund is available.
                    </li>
                    <li>
                      If you <strong>cancel</strong> your request before a doctor reviews it, you will
                      receive a full refund.
                    </li>
                    <li>
                      If a doctor is unable to review your request within 24 hours, you may request a full
                      refund.
                    </li>
                  </ul>
                  <p className="mt-3">
                    Some services may be eligible for Medicare rebates - this will be indicated during
                    checkout.
                  </p>
                </LegalSection>

                <LegalSection number="7" title="Prescriptions">
                  <p>
                    Prescriptions are issued at the sole discretion of the treating doctor. We do not
                    prescribe certain medications including Schedule 8 drugs, benzodiazepines, or other
                    controlled substances. Electronic prescriptions are sent via SMS or email and can be
                    dispensed at any pharmacy in Australia.
                  </p>
                </LegalSection>

                <LegalSection number="8" title="Telehealth Consent">
                  <p>
                    By using InstantMed, you consent to receiving healthcare services via telehealth (online
                    consultation). You understand and agree that:
                  </p>
                  <ul>
                    <li>
                      Consultations are primarily conducted asynchronously (text-based) without video or
                      phone calls, unless the doctor determines otherwise
                    </li>
                    <li>A doctor may request a phone or video consultation if clinically necessary</li>
                    <li>
                      Electronic prescriptions and medical certificates are delivered via email or SMS
                    </li>
                    <li>
                      Your health information is stored securely and may be accessed by treating clinicians
                    </li>
                    <li>Telehealth has limitations and some conditions require in-person examination</li>
                  </ul>
                </LegalSection>

                <LegalSection number="9" title="AI-Assisted Services" id="ai">
                  <p>InstantMed uses artificial intelligence to assist with certain administrative tasks, including:</p>
                  <ul>
                    <li>Summarizing your intake information for efficient doctor review</li>
                    <li>Drafting documents such as medical certificates (always reviewed by a doctor)</li>
                    <li>Improving the intake experience through smart suggestions</li>
                  </ul>
                  <p className="mt-3">
                    <strong>Important:</strong> AI does not make any clinical decisions. All medical
                    decisions are made by registered Australian doctors. AI-generated content is always
                    reviewed and approved by a clinician before being finalized or sent to you.
                  </p>
                </LegalSection>

                <LegalSection number="10" title="Record Retention">
                  <p>
                    In accordance with Australian healthcare record-keeping requirements, we retain your
                    health records for a minimum of 7 years from the date of your last consultation. You may
                    request access to your records at any time by contacting us.
                  </p>
                </LegalSection>

                <LegalSection number="11" title="Service Availability">
                  <p>
                    The online request flow is available 24/7. Doctor review for prescriptions and consultations
                    usually occurs during review hours (8am–10pm AEST, 7 days a week), and review times may
                    vary depending on demand and case complexity.
                  </p>
                  <p className="mt-3">
                    We do not guarantee specific response times. Our services are available to users located
                    in Australia only.
                  </p>
                </LegalSection>

                <LegalSection number="12" title="Limitation of Liability">
                  <p>
                    To the maximum extent permitted by law, InstantMed shall not be liable for any indirect,
                    incidental, special, consequential, or punitive damages arising from your use of our
                    services. Our total liability shall not exceed the amount paid by you for the specific
                    service giving rise to the claim.
                  </p>
                </LegalSection>

                <LegalSection number="13" title="Dispute Resolution">
                  <p>
                    If you have a complaint about our services, please contact us first at{" "}
                    <a href={`mailto:${CONTACT_EMAIL_COMPLAINTS}`} className="text-primary hover:underline">
                      {CONTACT_EMAIL_COMPLAINTS}
                    </a>
                    . We will endeavour to resolve your complaint within 14 business days. Our full complaints
                    process, including escalation pathways to AHPRA and state health complaints commissioners,
                    is documented at <Link href="/complaints" className="text-primary hover:underline">/complaints</Link>.
                  </p>
                  <p className="mt-3">
                    If we cannot resolve your complaint to your satisfaction, you may lodge a complaint with
                    the Australian Health Practitioner Regulation Agency (AHPRA) or the relevant state
                    health complaints commissioner.
                  </p>
                </LegalSection>

                <LegalSection number="14" title="Governing Law">
                  <p>
                    These Terms of Service are governed by the laws of New South Wales, Australia. You agree
                    to submit to the exclusive jurisdiction of the courts of New South Wales for any disputes
                    arising from these terms or your use of our services.
                  </p>
                </LegalSection>

                <LegalSection number="15" title="Account Termination">
                  <p>
                    We reserve the right to suspend or terminate your account if you violate these terms,
                    provide false information, or misuse our services. You may request account deletion at
                    any time by contacting us. Note that health records must be retained as per Section 10,
                    even after account deletion.
                  </p>
                </LegalSection>

                <LegalSection number="16" title="Contact">
                  <p>
                    For questions about these terms, please contact us at{" "}
                    <a href={`mailto:${CONTACT_EMAIL_LEGAL}`} className="text-primary hover:underline">
                      {CONTACT_EMAIL_LEGAL}
                    </a>
                    .
                  </p>
                </LegalSection>

              </div>
            </div>
          </section>
        </main>

        <CTABanner
          title="Questions about our terms?"
          subtitle="We're here to help. Reach out and we'll get back to you promptly."
          ctaText="Contact us"
          ctaHref="/contact"
        />

        <MarketingFooter />
      </div>
    </MarketingPageShell>
  )
}
