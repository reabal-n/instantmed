'use client'

import {
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"

// Morning Canvas components
import { SplitHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { CitationFacts } from "@/components/marketing/citation-facts"
import { GoogleAdsCert } from "@/components/marketing/google-ads-cert"
import { LegitScriptSeal } from "@/components/marketing/legitscript-seal"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { TrustGuideSection } from "@/components/marketing/sections/trust-guide-section"
import { CTABanner } from "@/components/sections/cta-banner"
import { FAQSection } from "@/components/sections/faq-section"
import { FeatureGrid } from "@/components/sections/feature-grid"
import { ImageTextSplit } from "@/components/sections/image-text-split"
import { StatStrip } from "@/components/sections/stat-strip"
import { Timeline } from "@/components/sections/timeline"
import { Navbar } from "@/components/shared/navbar"
import { Heading } from "@/components/ui/heading"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE, GUARANTEE_LABEL } from "@/lib/marketing/voice"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import { SOCIAL_PROOF } from "@/lib/social-proof"

// ─── Data ──────────────────────────────────────────────────────────

const CLINICAL_ACCESS_SCOPE = getApprovedClaim("clinical_access_scope")
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")
const COMPLAINTS_TIMING = getApprovedClaim("complaints_timing")
const DOCTOR_REGISTRATION = getApprovedClaim("doctor_registration")

const trustFAQs = [
  {
    question: "How do I know the doctors are real?",
    answer: "Every doctor on InstantMed holds current AHPRA registration - the same regulatory body that governs all Australian medical practitioners. You can verify any doctor's credentials yourself on the AHPRA public register.",
  },
  {
    question: "Will my employer accept certificates from InstantMed?",
    answer: "InstantMed certificates are issued by AHPRA-registered Australian doctors and include standard workplace evidence details, including the doctor's name and registration number. Employer policies may vary.",
  },
  {
    question: "What happens to my personal health information?",
    answer: "Health records use Australian-hosted primary storage. Data is encrypted in transit and sensitive fields are encrypted at rest. The privacy policy explains service-provider processing, retention, access, and correction rights.",
  },
  {
    question: "Is this actually reviewed by a doctor, or is it automated?",
    answer: CLINICAL_DECISION_MODEL,
  },
  {
    question: "What if I'm not happy with the service?",
    answer: `${COMPLAINTS_TIMING} You can also use the external escalation options listed on our complaints page.`,
  },
  {
    question: "Are electronic prescriptions legitimate?",
    answer: "If approved, an electronic prescription token is sent through Australia's electronic-prescribing infrastructure. Present the token to an Australian pharmacy, which applies its usual dispensing checks.",
  },
  {
    question: "How is my data stored and protected?",
    answer: "Health records use Australian-hosted primary storage. Transport encryption protects data in transit, and sensitive health fields use AES-256-GCM encryption at rest. Some service providers process the minimum data needed to deliver the service; the privacy policy lists those provider categories and safeguards.",
  },
  {
    question: "Can I delete my account and data?",
    answer: "You can ask to close your account and request access to or correction of your personal information. Some clinical, audit, financial, and legal records must be retained. Our privacy policy explains what can be removed and what must be kept.",
  },
  {
    question: "Who has access to my health information?",
    answer: CLINICAL_ACCESS_SCOPE,
  },
  {
    question: "How do I verify a certificate is genuine?",
    answer: "InstantMed certificates include a verification reference. The verification page confirms issuance details without displaying a diagnosis. Employer and institution policies may vary.",
  },
  {
    question: "What qualifications does the reviewing doctor hold?",
    answer: `${DOCTOR_REGISTRATION} Current registration can be checked independently on the AHPRA public register.`,
  },
  {
    question: "Are telehealth certificates accepted by universities?",
    answer: "A doctor-issued certificate can support a university or TAFE evidence request, but each institution sets its own policy. Check the relevant special-consideration or attendance rules before relying on any certificate.",
  },
]

const trustEvidenceLinks = [
  { href: "/blog/ahpra-registered-doctor-meaning", label: "What AHPRA registration means" },
  { href: "/clinical-governance", label: "Clinical governance" },
  { href: "/privacy", label: "Privacy and data handling" },
  { href: "/compare/online-medical-certificate-options", label: "Online certificate service comparison" },
  { href: "/verify", label: "Certificate verification" },
] as const

// ─── Page ──────────────────────────────────────────────────────────

export default function TrustPage() {
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
          subtitle={DOCTOR_REGISTRATION}
          imageSrc="/images/trust-hero.webp"
          imageAlt="Patient requesting a medical certificate from home"
        >
          <div className="flex flex-col gap-4">
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground tracking-wide uppercase">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              AHPRA-registered doctors · documented clinical governance · role-scoped access
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <LegitScriptSeal size="md" />
              <GoogleAdsCert size="md" />
            </div>
          </div>
        </SplitHero>

        <CitationFacts variant="muted" />

        <section className="px-4 py-10 border-y border-border/40 bg-muted/30 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Source-backed safety references
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/resources/telehealth-safety-checklist"
                className="group rounded-2xl border border-border/50 bg-white p-5 text-sm shadow-md shadow-primary/[0.06] transition-colors hover:border-primary/30 dark:border-white/15 dark:bg-card dark:shadow-none"
              >
                <span className="font-semibold text-foreground">Australian telehealth safety checklist</span>
                <span className="mt-2 block leading-6 text-muted-foreground">
                  Practitioner identity, privacy, clinical fit, and emergency boundaries.
                </span>
              </Link>
              <Link
                href="/resources/when-telehealth-is-not-appropriate"
                className="group rounded-2xl border border-border/50 bg-white p-5 text-sm shadow-md shadow-primary/[0.06] transition-colors hover:border-primary/30 dark:border-white/15 dark:bg-card dark:shadow-none"
              >
                <span className="font-semibold text-foreground">When telehealth is not appropriate</span>
                <span className="mt-2 block leading-6 text-muted-foreground">
                  Emergency care, in-person examination, tests, and continuity limits.
                </span>
              </Link>
            </div>

            <nav
              aria-label="Trust evidence"
              className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/40 pt-4 text-sm dark:border-white/10"
            >
              <span className="font-medium text-muted-foreground">Trust evidence:</span>
              {trustEvidenceLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-medium text-primary hover:underline underline-offset-4"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        {/* Page superpower — anchors human-decision accountability above the
            stats so the stats reinforce the claim rather than carry it alone. */}
        <ServiceClaimSection
          eyebrow="Doctor-owned clinical pathways"
          headline={
            <>
              Clear limits. <span className="text-primary">Named accountability</span>.
            </>
          }
          body={CLINICAL_DECISION_MODEL}
        />

        {/* ── Stats Counter Strip ───────────────────────────── */}
        <StatStrip
          stats={[
            { value: SOCIAL_PROOF.ahpraVerifiedPercent, suffix: "%", label: "AHPRA-registered doctors" },
            { value: SOCIAL_PROOF.refundPercent, suffix: "%", label: GUARANTEE_LABEL },
            { value: 3, suffix: " min", label: "Approximate form time" },
            { value: 24, suffix: "/7", label: "Requests and review" },
          ]}
        />

        {/* ── Doctor Verification ──────────────────────────── */}
        <ImageTextSplit
          title="AHPRA-registered doctors. No exceptions."
          highlightWords={["AHPRA-registered"]}
          description="Clinical access requires current AHPRA registration and is scoped by service-line capabilities. Registration can be checked independently on the public register."
          imageSrc="/images/trust-doctor.webp"
          imageAlt="Doctor reviewing a patient request at their desk"
          imagePosition="right"
        >
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "All doctors hold current AHPRA registration",
              "Service-line access is capability-scoped",
              "Treating clinician recorded in the clinical record",
              "Prescribing decisions stay with doctors",
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
          title="Australian health-record storage. Layered protection."
          highlightWords={["Layered protection."]}
          description="Health records use Australian-hosted primary storage. Data is encrypted in transit and sensitive fields are encrypted at rest. Our privacy policy explains the providers needed to deliver care."
          imageSrc="/images/trust-security.webp"
          imageAlt="Secure data center with blue lighting"
          imagePosition="left"
        >
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "Sensitive fields encrypted with AES-256-GCM at rest",
              "Australian-hosted primary health-record storage",
              "Privacy controls mapped to the Australian Privacy Principles",
              "Role-scoped clinical and operational access",
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
          subtitle="Layered controls protect your health information."
          highlightWords={["trust"]}
          features={[
            {
              icon: <StickerIcon name="lock" size={48} />,
              title: "Layered Encryption",
              description: "Transport encryption in transit and AES-256-GCM protection for sensitive fields at rest.",
            },
            {
              icon: <StickerIcon name="security-shield" size={48} />,
              title: "Privacy Controls",
              description: "Documented controls for collection, use, access, correction, retention, and disclosure.",
            },
            {
              icon: <StickerIcon name="fingerprint" size={48} />,
              title: "AHPRA Verified",
              description: "Current registration is checked and independently verifiable on the AHPRA public register.",
            },
            {
              icon: <StickerIcon name="server" size={48} />,
              title: "Australian Health Records",
              description: "Primary health-record storage is Australian-hosted; provider processing is disclosed in the privacy policy.",
            },
            {
              icon: <StickerIcon name="eye" size={48} />,
              title: "Clinical Audits",
              description: "Documented protocols, decision records, incident handling, and complaint review support governance.",
            },
            {
              icon: <StickerIcon name="scales" size={48} />,
              title: "Complaints Process",
              description: COMPLAINTS_TIMING,
            },
          ]}
          columns={3}
          className="bg-muted/30 dark:bg-muted/10"
        />

        {/* ── Accountability ───────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="mx-auto max-w-3xl text-center lg:text-left">
            <Heading level="h1" as="h2">
              Clear process. <span className="text-primary">Named accountability</span>.
            </Heading>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              AHPRA-registered doctors make prescribing decisions. Eligible low-risk medical certificates may follow a logged doctor-owned protocol and are individually reviewed afterward. If something doesn&apos;t look right, the request goes to a doctor.
            </p>
            <ul className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                "Every certificate is individually reviewed",
                COMPLAINTS_TIMING,
                GUARANTEE,
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
              description: "Answer the service-specific questions in a secure form. Takes about 3 minutes.",
              icon: <StickerIcon name="medical-history" size={48} />,
            },
            {
              title: "Request enters its service pathway",
              description: CLINICAL_REVIEW_SEQUENCE,
              icon: <StickerIcon name="sent" size={48} />,
            },
            {
              title: "Outcome or doctor follow-up",
              description: "A prescribing doctor may ask for more information before deciding. Certificate requests outside protocol criteria go to a doctor before any outcome.",
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
          subtitle={CLINICAL_DECISION_MODEL}
          ctaText="Start a request"
          ctaHref="/request"
          secondaryText={`No account required · ${GUARANTEE}`}
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
