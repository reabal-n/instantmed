'use client'

import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { useSyncExternalStore } from "react"

// Morning Canvas components
import { SplitHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { GoogleAdsCert,LegitScriptSeal, MarketingFooter } from "@/components/marketing"
import { TrustGuideSection } from "@/components/marketing/sections"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import {
  CTABanner,
  FAQSection,
  FeatureGrid,
  ImageTextSplit,
  StatStrip,
  Timeline,
} from "@/components/sections"
import { Navbar } from "@/components/shared"
import { Heading } from "@/components/ui/heading"
import { usePatientCount } from "@/lib/hooks/use-patient-count"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import { SOCIAL_PROOF } from "@/lib/social-proof"

// ─── Hydration helper ──────────────────────────────────────────────

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

// ─── Data ──────────────────────────────────────────────────────────

const trustFAQs = [
  {
    question: "How do I know the doctors are real?",
    answer: "Every doctor on InstantMed holds current AHPRA registration - the same regulatory body that governs all Australian medical practitioners. You can verify any doctor's credentials yourself on the AHPRA public register.",
  },
  {
    question: "Will my employer accept certificates from InstantMed?",
    answer: "Yes. Our medical certificates are issued by AHPRA-registered Australian doctors and are legally equivalent to certificates from any in-person clinic. They include the doctor's name, registration number, and all required details.",
  },
  {
    question: "What happens to my personal health information?",
    answer: "Your data is protected with AES-256 encryption and stored exclusively on Australian servers. We comply with the Privacy Act 1988 and all thirteen Australian Privacy Principles.",
  },
  {
    question: "Is this actually reviewed by a doctor, or is it automated?",
    answer: "Every single request is reviewed by a qualified, AHPRA-registered Australian doctor who makes an independent clinical decision. There are no automated approvals - ever.",
  },
  {
    question: "What if I'm not happy with the service?",
    answer: "General complaints are responded to within 48 hours. Formal clinical complaints are reviewed by our Medical Director within 14 days. You can also escalate concerns to the Health Complaints Commissioner in your state.",
  },
  {
    question: "Are electronic prescriptions legitimate?",
    answer: "Yes. Our eScripts are generated through official PBS channels and work at any Australian pharmacy. Electronic prescriptions are the national standard and fully compliant with the Therapeutic Goods Act.",
  },
  {
    question: "How is my data stored and protected?",
    answer: "All personal health information is encrypted with AES-256-GCM - the same standard used by banks and government agencies. We apply field-level encryption, meaning individual data fields are encrypted separately in our database. All data is stored on Australian-hosted servers and never leaves the country. Transport encryption (TLS) protects data in transit between your browser and our servers.",
  },
  {
    question: "Can I delete my account and data?",
    answer: "Yes. Under the Australian Privacy Principles, you have the right to request deletion of your personal information. Contact support@instantmed.com.au and we will process your request. Note that we are required by law to retain certain clinical records for a minimum period (typically 7 years for adults, or until a minor turns 25), but all other personal data can be deleted on request.",
  },
  {
    question: "Who has access to my health information?",
    answer: "Only the AHPRA-registered doctor reviewing your specific request has access to your clinical information during the consultation. Our systems enforce strict access controls - administrative staff cannot view your health data. After your request is completed, your records are accessible only to you through your secure patient dashboard.",
  },
  {
    question: "How do I verify a certificate is genuine?",
    answer: "Every certificate issued by InstantMed includes a unique verification ID. Employers, universities, and other institutions can verify any certificate at instantmed.com.au/verify by entering the certificate ID. This confirms the certificate was genuinely issued by our practice, the date it was issued, and the period of the certificate. This provides a level of verification that paper certificates from traditional clinics typically cannot offer.",
  },
  {
    question: "What qualifications does the reviewing doctor hold?",
    answer: "Every clinician on InstantMed is a registered medical practitioner with the Medical Board of Australia via AHPRA. They hold a recognised medical degree from an Australian or internationally accredited university, have completed supervised training, and maintain ongoing professional development. Every clinician carries professional indemnity insurance that meets Medical Board requirements.",
  },
  {
    question: "Are telehealth certificates accepted by universities?",
    answer: "Yes. Australian universities accept medical certificates from any AHPRA-registered doctor, regardless of whether the consultation was conducted in person or via telehealth. Our certificates include all the information universities require: the doctor's name and registration number, date of assessment, and the certified period of unfitness. Many universities also accept our online verification system as additional proof of authenticity.",
  },
]

// ─── Page ──────────────────────────────────────────────────────────

export default function TrustPage() {
  const mounted = useHasMounted()
  const patientCount = usePatientCount()

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: trustFAQs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />
      <Navbar variant="marketing" />

      <main id="main-content" aria-label="Trust and safety information">
        {/* ── Hero ──────────────────────────────────────────── */}
        <SplitHero
          pill="Trust & Safety"
          title="Your health. Our responsibility."
          highlightWords={["responsibility"]}
          subtitle="Real doctors. Transparent process. Every request reviewed by a qualified, AHPRA-registered clinician."
          imageSrc="/images/trust-hero.webp"
          imageAlt="Patient requesting a medical certificate from home"
        >
          <div className="flex flex-col gap-4">
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground tracking-wide uppercase">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              100% Australian-based · AHPRA registered · Privacy Act compliant
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <LegitScriptSeal size="md" />
              <GoogleAdsCert size="md" />
            </div>
          </div>
        </SplitHero>

        {/* Page superpower — anchors human-decision accountability above the
            stats so the stats reinforce the claim rather than carry it alone. */}
        <ServiceClaimSection
          eyebrow="No algorithm at the wheel"
          headline={
            <>
              Every decision, <span className="text-primary">a real doctor</span>.
            </>
          }
          body="No AI prescribes. No algorithm declines. An AHPRA-registered Australian GP reads your full request and makes the call, with full clinical accountability and a name on every certificate."
        />

        {/* ── Stats Counter Strip ───────────────────────────── */}
        <StatStrip
          stats={[
            { value: mounted ? patientCount : 420, suffix: "+", label: "Patients served" },
            { value: mounted ? SOCIAL_PROOF.averageRating : 4.8, suffix: "/5", label: "Patient rating" },
            { value: mounted ? SOCIAL_PROOF.averageResponseMinutes : 47, suffix: " min", label: "Avg response" },
            { value: mounted ? SOCIAL_PROOF.operatingDays : 7, suffix: " days/wk", label: "Available" },
          ]}
        />

        {/* ── Doctor Verification ──────────────────────────── */}
        <ImageTextSplit
          title="AHPRA-registered doctors. No exceptions."
          highlightWords={["AHPRA-registered"]}
          description="Every doctor on InstantMed holds current registration with the Australian Health Practitioner Regulation Agency. We verify credentials before they join and monitor registration status continuously."
          imageSrc="/images/trust-doctor.webp"
          imageAlt="Doctor reviewing a patient request at their desk"
          imagePosition="right"
        >
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "All doctors hold current AHPRA registration",
              "Professional indemnity insurance required",
              "Regular clinical decision audits",
              "Doctors make independent clinical decisions",
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm text-foreground/80 dark:text-foreground/70"
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/clinical-governance"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Our clinical governance
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </ImageTextSplit>

        {/* ── Data Protection ──────────────────────────────── */}
        <ImageTextSplit
          title="Your data stays in Australia. Always encrypted."
          highlightWords={["encrypted"]}
          description="Your health information is protected with AES-256 encryption - the same standard used by banks. All data stored on Australian servers, fully compliant with the Privacy Act 1988."
          imageSrc="/images/trust-security.webp"
          imageAlt="Secure data center with blue lighting"
          imagePosition="left"
        >
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "AES-256 encryption for all health data",
              "Stored exclusively on Australian servers",
              "Compliant with all 13 Australian Privacy Principles",
              "Regular security audits and penetration testing",
            ].map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm text-foreground/80 dark:text-foreground/70"
              >
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Privacy policy
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </ImageTextSplit>

        {/* ── Security Features Grid ───────────────────────── */}
        <FeatureGrid
          pill="Security"
          title="Built for trust at every layer"
          subtitle="Enterprise-grade security protecting your health information."
          highlightWords={["trust"]}
          features={[
            {
              icon: <StickerIcon name="lock" size={48} />,
              title: "AES-256 Encryption",
              description: "Bank-grade encryption for all personal health information at rest and in transit.",
            },
            {
              icon: <StickerIcon name="security-shield" size={48} />,
              title: "Privacy Act Compliant",
              description: "Full compliance with the Privacy Act 1988 and all 13 Australian Privacy Principles.",
            },
            {
              icon: <StickerIcon name="fingerprint" size={48} />,
              title: "AHPRA Verified",
              description: "Every doctor's registration is verified and continuously monitored.",
            },
            {
              icon: <StickerIcon name="server" size={48} />,
              title: "Australian Servers",
              description: "All health data stored exclusively on Australian-based servers.",
            },
            {
              icon: <StickerIcon name="eye" size={48} />,
              title: "Clinical Audits",
              description: "Regular audits of clinical decisions to maintain the highest standards.",
            },
            {
              icon: <StickerIcon name="scales" size={48} />,
              title: "Complaints Process",
              description: "48-hour response for general complaints; 14-day Medical Director review for clinical complaints.",
            },
          ]}
          columns={3}
          className="bg-muted/30 dark:bg-muted/10"
        />

        {/* ── Accountability ───────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="mx-auto max-w-3xl text-center lg:text-left">
            <Heading level="h1" as="h2">
              Clear process. <span className="text-primary">No automated</span> approvals.
            </Heading>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Every request is reviewed by a human doctor who reads your full medical history and makes an independent clinical decision. If something doesn&apos;t look right, they&apos;ll contact you directly.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                "Every request is human-reviewed",
                "General complaints responded to within 48 hours",
                "Full refund if we can't help",
                "Escalation to Health Complaints Commissioner",
              ].map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-foreground/80 dark:text-foreground/70"
                >
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                Contact us
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Process Timeline ──────────────────────────────── */}
        <Timeline
          pill="Behind the scenes"
          title="What happens with your request"
          subtitle="Complete transparency on how your request is handled."
          highlightWords={["transparency"]}
          steps={[
            {
              title: "You submit your request",
              description: "Answer a few questions about your situation. Takes about 2 minutes.",
              icon: <StickerIcon name="medical-history" size={48} />,
            },
            {
              title: "Request enters review queue",
              description: "Securely transmitted and queued for doctor review.",
              icon: <StickerIcon name="sent" size={48} />,
            },
            {
              title: "Doctor reviews your case",
              description: "An AHPRA-registered doctor reviews your full submission. Average ~34 min.",
              icon: <StickerIcon name="user-check" size={48} />,
            },
            {
              title: "Personal follow-up",
              description: "The doctor may approve, request more info, or contact you directly.",
              icon: <StickerIcon name="phone" size={48} />,
            },
            {
              title: "Document delivered",
              description: "Certificates emailed to your dashboard. eScripts sent via SMS.",
              icon: <StickerIcon name="sent" size={48} />,
            },
          ]}
          className="bg-muted/30 dark:bg-muted/10"
        />

        {/* ── E-E-A-T Guide ─────────────────────────────────── */}
        <TrustGuideSection />

        {/* ── Trust FAQ ─────────────────────────────────────── */}
        <FAQSection
          pill="Questions"
          title="Common questions about trust"
          subtitle="We understand you want to be sure."
          highlightWords={["trust"]}
          items={trustFAQs}
          className="bg-muted/30 dark:bg-muted/10"
        />

        {/* ── CTA ───────────────────────────────────────────── */}
        <CTABanner
          title="Confident in the process?"
          subtitle={`Join ${mounted ? patientCount.toLocaleString() : "420"}+ Australians who've already made the switch.`}
          ctaText="Start a request"
          ctaHref="/request"
          secondaryText="No account required · Full refund if request declined"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}

