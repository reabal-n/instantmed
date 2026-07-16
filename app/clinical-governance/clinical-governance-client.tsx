"use client"

import { ExternalLink } from "lucide-react"
import Link from "next/link"

import { StatsHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { CitationFacts } from "@/components/marketing/citation-facts"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import type { GuideSectionData } from "@/components/marketing/sections/data-driven-guide-section"
import { DataDrivenGuideSection } from "@/components/marketing/sections/data-driven-guide-section"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { AccordionSection } from "@/components/sections/accordion-section"
import { CTABanner } from "@/components/sections/cta-banner"
import { FeatureGrid } from "@/components/sections/feature-grid"
import { IconChecklist } from "@/components/sections/icon-checklist"
import { Timeline } from "@/components/sections/timeline"
import type { ChecklistItem, FeatureItem, StatItem, TimelineStep } from "@/components/sections/types"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared/navbar"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

const CLINICAL_ACCESS_SCOPE = getApprovedClaim("clinical_access_scope")
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const COMPLAINTS_TIMING = getApprovedClaim("complaints_timing")
const DOCTOR_REGISTRATION = getApprovedClaim("doctor_registration")

/* ────────────────────────────── Data ────────────────────────────── */

const heroStats: StatItem[] = [
  { value: 100, suffix: "%", label: "AHPRA-registered doctors" },
  { value: 13, label: "Privacy principles covered" },
  { value: 0, prefix: "S", suffix: " substances", label: "Controlled drugs prescribed" },
]

const standardsChecklist: ChecklistItem[] = [
  { text: "AHPRA registration and technology-based consultation guidance" },
  { text: "Medicines scheduling and prescribing requirements" },
  { text: "Australian Privacy Principles (APP)" },
  { text: "Documented scope-of-practice and escalation rules" },
]

const reviewProcess: TimelineStep[] = [
  {
    title: "Clinical ownership",
    description:
      "AHPRA-registered medical leadership owns the protocols and service boundaries. Complex or out-of-scope cases move to a documented alternative-care pathway.",
  },
  {
    title: "Recorded outcomes",
    description:
      "Clinical outcomes, follow-up, and declines are recorded so decisions can be reviewed and complaints can be investigated.",
  },
  {
    title: "Feedback and incidents",
    description:
      "Complaint records, clinical incidents, and relevant regulatory changes can trigger review of a pathway or protocol.",
  },
]

const safeguards: FeatureItem[] = [
  {
    icon: <StickerIcon name="medical-doctor" size={44} />,
    title: "Clinical Leadership",
    description:
      "AHPRA-registered medical leadership owns documented protocols, scope boundaries, and escalation pathways.",
  },
  {
    icon: <StickerIcon name="scales" size={44} />,
    title: "Scope of Practice",
    description:
      "Focused on low-complexity, high-frequency presentations. Complex or high-risk cases referred to in-person care.",
  },
  {
    icon: <StickerIcon name="checklist" size={44} />,
    title: "Quality Assurance",
    description:
      "Clinical outcomes, incidents, and complaints create records that can be reviewed and used to improve a pathway.",
  },
  {
    icon: <StickerIcon name="warning" size={44} />,
    title: "Safety Boundaries",
    description:
      "No Schedule 8 prescribing. Requests needing examination, testing, or urgent care are outside the online pathway.",
  },
  {
    icon: <StickerIcon name="synchronize" size={44} />,
    title: "Continuous Improvement",
    description:
      "Relevant complaints, incidents, evidence, and regulatory changes can prompt protocol review.",
  },
  {
    icon: <StickerIcon name="medical-history" size={44} />,
    title: "Evidence-Based Protocols",
    description:
      "Clinical processes use Australian practitioner guidance, medicines rules, privacy law, and documented service boundaries.",
  },
]

/* ────────────────────────────── Guide Sections ────────────────────────────── */

const guideSections: GuideSectionData[] = [
  {
    id: "what-clinical-governance-means",
    icon: "security-shield",
    title: "What clinical governance means in telehealth",
    paragraphs: [
      "Clinical governance is the framework for keeping care accountable: who owns a pathway, what sits inside its scope, how outcomes are recorded, and what happens when a request needs different care.",
      `InstantMed starts with structured health information rather than a physical examination. A doctor may call or message before deciding, and the pathway must stop when examination, testing, ongoing monitoring, or urgent care is needed. ${CLINICAL_DECISION_MODEL}`,
      "The governance framework joins those limits to documented protocols, staff access boundaries, incident handling, and a complaints pathway.",
    ],
  },
  {
    id: "how-doctor-decisions-are-reviewed",
    icon: "scales",
    title: "How doctor decisions are reviewed",
    paragraphs: [
      "Approved, declined, and follow-up outcomes are recorded with the relevant request information. Eligible protocol-issued certificates also require an individual doctor review afterward.",
      "Those records support clinical follow-up, complaint investigation, and review of whether the service boundary or protocol needs to change. We do not publish an audit cadence or sampling claim that cannot be independently substantiated.",
      "Clinical incidents and reported adverse outcomes follow the documented incident process. They are recorded, investigated, and reported externally when a legal or professional duty applies.",
      COMPLAINTS_TIMING,
    ],
  },
  {
    id: "prescribing-boundaries",
    icon: "warning",
    title: "Our prescribing boundaries",
    paragraphs: [
      "InstantMed does not prescribe Schedule 8 controlled substances. Requests that need physical examination, diagnostic testing, or monitoring that cannot be established remotely are also outside scope.",
      "Repeat-prescription pathways are for medicines the patient is already established on. Selected specialty pathways may assess a new treatment only within their structured screener and documented exclusions; they are not a general-prescribing back channel.",
      "The form organises contraindications, current medicines, and pathway-specific safety answers for the reviewing doctor. Automated checks can flag or block scope issues, but they do not prescribe or make the clinical decision.",
      "If a prescribing request falls outside scope, the outcome should explain that the online pathway is not suitable and direct the patient to appropriate care.",
    ],
  },
  {
    id: "patient-safety-and-escalation",
    icon: "heart",
    title: "Patient safety and escalation",
    paragraphs: [
      "Patient safety in telehealth depends on recognising what cannot be assessed remotely. Intake red flags can direct a patient to 000 or urgent in-person care before an online request continues.",
      "When further assessment is needed but the situation is not an emergency, a doctor may ask follow-up questions, decline the request, and recommend an in-person doctor, testing, or another appropriate service.",
      "Emergency guidance does not replace 000, and a patient with severe or rapidly worsening symptoms should not wait for an online review.",
      "Declines and escalations are recorded clinical outcomes. They are part of applying the service boundary, not a promise that every presentation can be resolved online.",
    ],
  },
  {
    id: "regulatory-framework",
    icon: "certificate",
    title: "Regulatory framework",
    paragraphs: [
      `${DOCTOR_REGISTRATION} AHPRA registers practitioners, not InstantMed Pty Ltd, and registration can be checked on the public register.`,
      "Medicines supplied through the service remain subject to Australian scheduling, prescribing, and pharmacy requirements. InstantMed is a private-pay service and does not present PBS participation as a platform credential.",
      "Our clinical governance is built around Australian medical regulation, privacy law, prescribing rules, documented scope boundaries, and the realities of asynchronous telehealth. We do not claim third-party college accreditation unless it has been formally granted.",
      `Patient privacy is governed by the Privacy Act and Australian Privacy Principles. ${CLINICAL_ACCESS_SCOPE} The privacy policy explains service-provider processing, retention, access, and correction requests. Medical certificates are doctor-issued evidence; employer and institution policies may vary.`,
    ],
  },
]

/* ────────────────────────────── FAQs ────────────────────────────── */

const clinicalGovernanceFaqs = [
  {
    question: "Who reviews clinical protocols at InstantMed?",
    answer: "AHPRA-registered medical leadership owns the clinical protocols and service boundaries. Relevant safety, evidence, incident, and regulatory changes can trigger review; we do not promise a public review cadence.",
  },
  {
    question: "What are the practitioner qualifications?",
    answer: `${DOCTOR_REGISTRATION} Registration can be checked independently on the AHPRA public register.`,
  },
  {
    question: "How are clinical decisions audited?",
    answer: "Clinical outcomes and the information used to reach them are recorded. Those records support follow-up, complaint investigation, incident review, and review of whether a pathway or protocol needs to change.",
  },
  {
    question: "What happens if a doctor makes a mistake?",
    answer: "A reported clinical incident follows the documented incident process: it is recorded, investigated, and escalated or reported externally when a legal or professional duty applies. A patient can also use the formal complaints pathway.",
  },
  {
    question: "How does InstantMed handle complaints?",
    answer: `Complaints can be submitted to complaints@instantmed.com.au. ${COMPLAINTS_TIMING} The complaints page lists external escalation routes, including the relevant state or territory health complaints body, AHPRA, and the OAIC for privacy matters.`,
  },
  {
    question: "How does remote governance differ from a regular clinic?",
    answer: "We use clinical governance, patient-safety, privacy, escalation, and documentation standards appropriate to asynchronous telehealth. We do not claim third-party college accreditation unless it has been formally granted. The key difference is context: telehealth needs extra governance around intake quality, remote-assessment limits, and when to send someone to in-person care.",
  },
  {
    question: "How do you ensure prescribing safety?",
    answer: `Structured forms collect relevant history, current medicines, contraindications, and pathway-specific safety answers. Scope checks can flag or block unsafe requests, and a doctor makes every prescribing decision. ${CLINICAL_DECISION_MODEL}`,
  },
  {
    question: "What clinical conditions do you NOT treat?",
    answer: "We do not treat emergencies, people under 18, requests for Schedule 8 controlled medicines, or presentations needing physical examination, diagnostic testing, or complex ongoing monitoring. The active service pages describe the narrower pathway-specific exclusions.",
  },
  {
    question: "How often are your protocols updated?",
    answer: "Protocols can be updated when relevant evidence, incidents, complaints, or regulatory requirements change. We do not advertise a fixed public review cadence.",
  },
  {
    question: "Is there a Medical Director overseeing care?",
    answer: "Yes. AHPRA-registered medical leadership owns clinical protocols, scope boundaries, incident review, and escalation. Public pages do not disclose individual doctor names or the number of doctors.",
  },
  {
    question: "How do you handle conflicts of interest?",
    answer: "Business staff cannot override a clinical decline. When a doctor records a clinical decline, the patient receives a full refund, including any priority fee, so the request is not converted into a paid approved outcome.",
  },
  {
    question: "What data do you collect and how is it protected?",
    answer: `We collect the personal and health information needed for the selected request. Data is encrypted in transit and sensitive fields are encrypted at rest. ${CLINICAL_ACCESS_SCOPE} Full provider, retention, access, and correction details are in the Privacy Policy.`,
  },
]

/* ────────────────────────────── Component ────────────────────────────── */

export default function ClinicalGovernanceClient() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero - compliance stats */}
        <StatsHero
          pill="Clinical Governance"
          title="Good medicine starts with good governance"
          highlightWords={["governance"]}
          subtitle="Documented clinical ownership, service boundaries, access controls, incident handling, and complaint escalation for form-first telehealth."
          stats={heroStats}
        />

        {/* Page superpower — clinical-governance pages live or die on the
            "doctor-led, accountable" framing. Pull it forward as a claim. */}
        <ServiceClaimSection
          eyebrow="Doctor-led, doctor-accountable"
          headline={
            <>
              <span className="text-primary">Clinical accountability</span> stays with doctors.
            </>
          }
          body={CLINICAL_DECISION_MODEL}
        />

        <CitationFacts variant="muted" />

        {/* Standards we follow */}
        <IconChecklist
          pill="Standards"
          title="Guidelines we follow"
          highlightWords={["follow"]}
          subtitle="Our clinical processes align with established Australian medical standards and regulations."
          items={standardsChecklist}
        />

        {/* Review process timeline */}
        <Timeline
          pill="Process"
          title="How we maintain clinical quality"
          highlightWords={["quality"]}
          subtitle="Systematic review and continuous improvement at every level."
          steps={reviewProcess}
        />

        {/* Safeguards grid */}
        <FeatureGrid
          pill="Safeguards"
          title="Built-in safety at every step"
          highlightWords={["safety"]}
          subtitle="Clear boundaries and structured oversight protect every patient interaction."
          features={safeguards}
          columns={3}
        />

        {/* In-depth governance guide */}
        <DataDrivenGuideSection
          ariaLabel="clinical governance guide"
          title="How clinical governance works at InstantMed"
          subtitle="The framework that ensures every patient interaction meets Australian healthcare standards."
          sections={guideSections}
        />

        {/* External verification - keep as custom since it has external links */}
        <section className="py-16 px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Heading level="h2" className="mb-4">
              Independent verification
            </Heading>
            <p className="text-muted-foreground mb-6">
              Doctor registration can be independently checked on the AHPRA public
              register. InstantMed documents its clinical protocols, incident process,
              complaints pathway, and escalation rules without implying AHPRA endorses
              the company.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                variant="outline"
                className="rounded-full bg-transparent"
              >
                <Link
                  href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  AHPRA Register
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ structured data */}
        <FAQSchema faqs={clinicalGovernanceFaqs} />

        {/* FAQs */}
        <AccordionSection
          pill="FAQs"
          title="Clinical governance questions"
          highlightWords={["questions"]}
          subtitle="Common questions about how we maintain clinical standards and patient safety."
          groups={[
            {
              items: clinicalGovernanceFaqs,
            },
          ]}
        />

        <section className="px-4 py-16 bg-muted/30 dark:bg-white/[0.02] border-y border-border/40 dark:border-white/10">
          <div className="mx-auto max-w-2xl text-center">
            <Heading level="h2" className="mb-4">
              Plain-English complaints and governance
            </Heading>
            <p className="text-muted-foreground mb-6">
              A source-backed explainer on complaint handling, practitioner accountability,
              privacy escalation, and clinical governance records.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                variant="outline"
                className="rounded-full bg-transparent"
              >
                <Link href="/resources/complaints-clinical-governance">
                  Read the explainer
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full bg-transparent"
              >
                <Link href="/resources/repeat-prescription-safety-checklist">
                  Prescription safety checklist
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <CTABanner
          title="Questions about our clinical standards?"
          subtitle="We're happy to explain how we maintain quality and safety across all consultations."
          ctaText="Contact us"
          ctaHref="/contact"
          secondaryText="About our clinicians"
          secondaryHref="/our-doctors"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
