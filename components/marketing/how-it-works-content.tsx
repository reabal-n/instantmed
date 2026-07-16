"use client"

import Link from "next/link"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { DoctorCredibility } from "@/components/marketing/doctor-credibility"
import { RegulatoryPartners } from "@/components/marketing/regulatory-partners"
import { CommercialIntentLinksSection } from "@/components/marketing/sections/commercial-intent-links-section"
import type { GuideSectionData } from "@/components/marketing/sections/data-driven-guide-section"
import { DataDrivenGuideSection } from "@/components/marketing/sections/data-driven-guide-section"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { InformationalPageShell } from "@/components/marketing/shared/informational-page-shell"
import { CTABanner } from "@/components/sections/cta-banner"
import { FAQSection } from "@/components/sections/faq-section"
import { FeatureGrid } from "@/components/sections/feature-grid"
import { Timeline } from "@/components/sections/timeline"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"
import { commercialComparisonLinks } from "@/lib/seo/commercial-links"

/* ────────────────────────────── Data ────────────────────────────── */

const CLINICAL_ACCESS_SCOPE = getApprovedClaim("clinical_access_scope")
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const DOCTOR_REGISTRATION = getApprovedClaim("doctor_registration")

const features = [
  {
    icon: <StickerIcon name="clock" size={44} />,
    title: "24/7 service",
    description:
      getApprovedClaim("availability_24_7"),
  },
  {
    icon: <StickerIcon name="security-shield" size={44} />,
    title: "AHPRA registered",
    description: DOCTOR_REGISTRATION,
  },
  {
    icon: <StickerIcon name="wallet" size={44} />,
    title: "No subscriptions",
    description: "Pay per request. No monthly fees or subscription.",
  },
  {
    icon: <StickerIcon name="sent" size={44} />,
    title: "Digital delivery",
    description:
      "Everything sent via email or SMS. No app to download, nothing to print.",
  },
]

const servicePathways = [
  {
    title: "Medical certificates",
    href: "/medical-certificate",
    summary: "For short-term illness, carer's leave, work, study, or employer evidence when the request fits the online certificate pathway.",
    doctorChecks: "Symptoms, dates, red flags, whether the request fits telehealth, and whether the period requested is clinically reasonable.",
    outcome: `PDF certificate by email and dashboard if approved. ${GUARANTEE}`,
  },
  {
    title: "Online prescriptions",
    href: "/prescriptions",
    summary: "For medication renewals and selected treatment requests where the doctor can verify identity, safety, and prescribing suitability.",
    doctorChecks: "Current medication, dose, allergies, contraindications, recent review history, and whether follow-up or in-person care is safer.",
    outcome: "eScript by SMS if approved. If it is not appropriate, the doctor explains the next step and the request is refunded.",
  },
  {
    title: "Specialty assessments",
    href: "/consult",
    summary: "For active ED, hair-loss, UTI, and contraceptive-pill pathways that use structured screening and doctor judgement.",
    doctorChecks: "Symptoms, duration, medical history, risk factors, photos if relevant, and whether written advice, prescription, referral, or in-person review is safest.",
    outcome: "A written outcome or eScript if approved, or clear guidance to seek in-person care.",
  },
]

const howItWorksGuide: GuideSectionData[] = [
  {
    id: "submission",
    icon: "checklist",
    title: "What happens when you submit a request",
    paragraphs: [
      "The questionnaire collects the symptoms, timing, relevant history, medicines, and pathway-specific safety answers needed for the selected request. It cannot replace a physical examination or diagnostic testing.",
      `${CLINICAL_DECISION_MODEL} A doctor may call or message before deciding, and the pathway stops when in-person care is safer. ${GUARANTEE}`,
    ],
  },
  {
    id: "clinical-standards",
    icon: "stethoscope",
    title: "The clinical standards behind the screen",
    paragraphs: [
      DOCTOR_REGISTRATION,
      "Our clinical governance framework documents service limits, decision records, incident handling, complaint escalation, and when a request must move to another care setting. Prescribing requests can be declined when they are not clinically appropriate.",
    ],
  },
  {
    id: "service-types",
    icon: "medical-history",
    title: "Medical certificates vs prescriptions vs consultations",
    paragraphs: [
      "We offer specialised one-off services, each with a different clinical pathway. Medical certificates cover short absences when the reported history fits the certificate protocol. Repeat prescriptions are for medicines you already take. ED, hair-loss, UTI, and contraceptive-pill requests use structured specialty screeners.",
      "The information and review sequence vary by pathway. Specialty and prescribing requests require a doctor decision and may need follow-up contact. Eligible low-risk certificate requests may use the logged doctor-owned protocol, followed by individual doctor review.",
    ],
  },
  {
    id: "scope",
    icon: "laptop",
    title: "What we can and can't do online",
    paragraphs: [
      "InstantMed is limited to focused one-off pathways: short medical certificates, repeat-prescription requests, and the active ED, hair-loss, UTI, and contraceptive-pill assessments. It is not a general or ongoing-care service.",
      "We do not prescribe Schedule 8 controlled medicines or issue WorkCover certificates. Presentations requiring blood tests, imaging, physical examination, urgent care, or complex ongoing monitoring sit outside these pathways. If the doctor declines, the full request fee and any priority fee are refunded.",
    ],
  },
  {
    id: "privacy",
    icon: "lock",
    title: "Your privacy and data security",
    paragraphs: [
      `Health records use Australian-hosted primary storage. Data is encrypted in transit and sensitive fields are encrypted at rest. ${CLINICAL_ACCESS_SCOPE}`,
      "The privacy policy explains service-provider processing, retention, and access or correction requests. InstantMed is a private-pay service and does not claim a Medicare rebate for the review fee.",
    ],
  },
]

const HIW_CONFIG = {
  analyticsId: "how-it-works" as const,
  sticky: false as const,
}

/* ────────────────────────────── Component ────────────────────────────── */

interface HowItWorksContentProps {
  faqs: Array<{ question: string; answer: string }>
  processSteps: Array<{ title: string; description: string }>
}

export function HowItWorksContent({ faqs, processSteps }: HowItWorksContentProps) {
  return (
    <InformationalPageShell config={HIW_CONFIG}>
      {() => (
        <>
        {/* Hero */}
        <CenteredHero
          pill="How It Works"
          title="Healthcare that fits your life"
          highlightWords={["your life"]}
          subtitle="Submit a focused request online through a doctor-owned clinical pathway. A doctor may call or message if more information is needed."
        />

        {/* Page superpower — a clear accountability promise across both the
            doctor-review and eligible medical-certificate protocol paths. */}
        <ServiceClaimSection
          eyebrow="Doctor-owned at every step"
          headline={
            <>
              <span className="text-primary">Form-first</span>, with clear accountability.
            </>
          }
          body={CLINICAL_DECISION_MODEL}
        />

        {/* Process Steps */}
        <Timeline
          pill="3 simple steps"
          title="Three steps. That's it."
          highlightWords={["steps"]}
          subtitle="No hidden steps, no surprises, no catch."
          steps={processSteps}
        />

        {/* Service pathway detail */}
        <section aria-label="Service pathway detail" className="py-16 lg:py-20 px-4 bg-muted/30 dark:bg-white/[0.02]">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-3">
                Service pathway detail
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                What the doctor checks depends on what you ask for
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Each service has a different clinical threshold. The important detail is what information the doctor reviews, what outcome you receive, and when online care is not the right channel.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {servicePathways.map((pathway) => (
                <article
                  key={pathway.title}
                  className="rounded-xl border border-border/50 bg-white p-5 shadow-sm shadow-primary/[0.04] dark:bg-card"
                >
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    <Link href={pathway.href} className="hover:text-primary transition-colors">
                      {pathway.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {pathway.summary}
                  </p>
                  <div className="space-y-3 border-t border-border/50 pt-4">
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Doctor checks</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{pathway.doctorChecks}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Likely outcome</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{pathway.outcome}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              <Link href="/our-doctors" className="text-primary underline underline-offset-4 hover:text-primary/80">
                Check our clinical team
              </Link>
              <Link href="/clinical-governance" className="text-primary underline underline-offset-4 hover:text-primary/80">
                Read clinical governance
              </Link>
              <Link href="/what-we-wont-do" className="text-primary underline underline-offset-4 hover:text-primary/80">
                See what we will not do online
              </Link>
            </div>
          </div>
        </section>

        <CommercialIntentLinksSection
          title="Choose the right online pathway"
          body="Comparison pages for patients deciding between online certificates, GP visits, bulk-billed telehealth, and focused private requests."
          links={commercialComparisonLinks}
        />

        {/* Doctor Credibility */}
        <DoctorCredibility
          variant="section"
          stats={["experience", "approval", "sameDay"]}
          className="px-4 sm:px-6"
        />

        {/* Features */}
        <FeatureGrid
          pill="Why InstantMed?"
          title="Why Aussies trust us"
          highlightWords={["trust"]}
          subtitle="Real reasons, not marketing fluff."
          features={features}
          columns={4}
        />

        {/* Regulatory Partners */}
        <RegulatoryPartners className="py-12" />

        {/* Long-form E-E-A-T Guide Section */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <DataDrivenGuideSection
            ariaLabel="How online healthcare works in Australia"
            title="How online healthcare actually works in Australia"
            subtitle="The clinical process behind what looks simple, and why it's more thorough than you might think."
            sections={howItWorksGuide}
          />
        </div>

        {/* FAQ Section */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <FAQSection
            pill="FAQ"
            title="Common questions"
            subtitle="Everything you need to know about using InstantMed."
            items={faqs}
          />
        </div>

        {/* CTA */}
        <CTABanner
          title="Ready when you are"
          subtitle="Pick what you need, fill in a quick form, and a doctor takes care of the rest."
          ctaText="Get Med Cert"
          ctaHref="/request?service=med-cert"
          secondaryText="Renew medication"
          secondaryHref="/request?service=repeat-script"
        />
        </>
      )}
    </InformationalPageShell>
  )
}
