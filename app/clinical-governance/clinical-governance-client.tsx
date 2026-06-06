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

/* ────────────────────────────── Data ────────────────────────────── */

const heroStats: StatItem[] = [
  { value: 100, suffix: "%", label: "AHPRA-registered doctors" },
  { value: 13, label: "Privacy principles covered" },
  { value: 0, prefix: "S", suffix: " substances", label: "Controlled drugs prescribed" },
]

const standardsChecklist: ChecklistItem[] = [
  { text: "AHPRA registration and technology-based consultation guidance" },
  { text: "Therapeutic Goods Administration (TGA) prescribing regulations" },
  { text: "Pharmaceutical Benefits Scheme (PBS) guidelines" },
  { text: "Australian Privacy Principles (APP)" },
  { text: "Documented scope-of-practice and escalation rules" },
]

const reviewProcess: TimelineStep[] = [
  {
    title: "Clinical Leadership",
    description:
      "AHPRA-registered Medical Director designs and maintains every clinical protocol. Complex or out-of-scope cases are declined with a documented pathway back to in-person care.",
  },
  {
    title: "Quality Assurance",
    description:
      "Structured self-audit against written protocols, random sampling of approved and declined cases, incident reporting framework, and patient feedback integration.",
  },
  {
    title: "Continuous Improvement",
    description:
      "Quarterly protocol reviews, post-incident reviews and process updates, relevant regulatory updates, and ongoing CPD in line with AHPRA requirements.",
  },
]

const safeguards: FeatureItem[] = [
  {
    icon: <StickerIcon name="medical-doctor" size={44} />,
    title: "Clinical Leadership",
    description:
      "AHPRA-registered Medical Director maintains every clinical protocol with a documented review cycle and escalation pathway.",
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
      "Structured self-audit, random sampling of approved and declined cases, incident reporting framework, and patient feedback integration.",
  },
  {
    icon: <StickerIcon name="warning" size={44} />,
    title: "Safety Boundaries",
    description:
      "No controlled substances (S8). No treatments requiring physical examination. Automatic escalation for red-flag symptoms.",
  },
  {
    icon: <StickerIcon name="synchronize" size={44} />,
    title: "Continuous Improvement",
    description:
      "Quarterly protocol reviews, post-incident reviews, regulatory updates, and ongoing CPD.",
  },
  {
    icon: <StickerIcon name="medical-history" size={44} />,
    title: "Evidence-Based Protocols",
    description:
      "Clinical processes align with AHPRA guidance, TGA regulations, PBS requirements, privacy law, and documented service boundaries.",
  },
]

/* ────────────────────────────── Guide Sections ────────────────────────────── */

const guideSections: GuideSectionData[] = [
  {
    id: "what-clinical-governance-means",
    icon: "security-shield",
    title: "What clinical governance means in telehealth",
    paragraphs: [
      "Clinical governance is the framework that ensures healthcare organisations deliver safe, effective, and accountable care. In a traditional GP clinic, governance happens partly by proximity - doctors work alongside colleagues, practice managers observe workflows, and patients interact face-to-face with their care team. Telehealth removes that proximity, which means governance has to be more deliberate, more structured, and more transparent.",
      "At InstantMed, patients submit health information through structured intake forms rather than describing symptoms in a consulting room. A doctor reviews that information asynchronously - there is no physical examination, no visual cues from body language, and no opportunity to ask follow-up questions in real time. This makes the quality of the intake process, the clinical decision-making framework, and the audit trail significantly more important than they might be in a face-to-face setting.",
      "Our governance framework exists to answer a straightforward question: how do we ensure that every clinical decision made on this platform is consistent, documented, and inside scope? The answer involves structured protocols, audit trails, defined boundaries, and continuous improvement - none of which are optional, and all of which are documented here.",
    ],
  },
  {
    id: "how-doctor-decisions-are-reviewed",
    icon: "scales",
    title: "How doctor decisions are reviewed",
    paragraphs: [
      "Every clinical decision at InstantMed is traceable. When a doctor approves, declines, or escalates a patient request, that decision is recorded with the clinical reasoning, the information reviewed, and the outcome. This audit trail is not optional - it is built into the platform architecture and cannot be bypassed.",
      "Our Medical Director conducts structured audits of clinical decisions across all service types. This includes random sampling of approved certificates and prescriptions, targeted review of declined or escalated cases, and thematic analysis of decision patterns over time. The goal is ensuring consistency, identifying protocol gaps, and catching systemic issues before they affect patients.",
      "We maintain a structured incident reporting framework. Any adverse outcome, clinical near-miss, patient complaint, or process failure is logged, investigated, and reviewed. Post-incident reviews result in documented process changes where warranted. This is standard practice in hospital settings and accredited general practices - we apply the same rigour to telehealth.",
      "Patient feedback is integrated into our quality cycle. Every interaction generates an opportunity for the patient to report concerns, and those reports feed directly into clinical review processes. A complaint about a declined request is treated differently from a complaint about communication - both are investigated, but through different pathways with different clinical oversight.",
    ],
  },
  {
    id: "prescribing-boundaries",
    icon: "warning",
    title: "Our prescribing boundaries",
    paragraphs: [
      "InstantMed maintains strict prescribing boundaries that go beyond minimum regulatory requirements. We do not prescribe Schedule 8 (controlled) substances under any circumstances. This is a hard boundary enforced at the platform level - our intake system will not accept requests for these medications, and the restriction cannot be clinician-overridden. There is no clinical scenario in which an asynchronous telehealth consultation is the appropriate channel for initiating or continuing controlled substance therapy.",
      "We focus on repeat prescriptions for medications that the patient is already established on, prescribed by their regular GP or specialist. We do not initiate new medications for complex conditions, adjust doses for medications with narrow therapeutic indices, or prescribe medications that require monitoring through blood tests or other investigations that we cannot facilitate remotely.",
      "Every prescription request is validated against our clinical protocols before it reaches a doctor. The system checks for known contraindications, flags medications that require specific monitoring, and identifies requests that fall outside our defined scope of practice. The reviewing doctor makes the final clinical decision - the system supports that decision with structured information, but does not replace clinical judgement.",
      "If a prescribing request falls outside our scope, we decline it with a clear explanation and a recommendation that the patient consult their regular GP or an appropriate specialist. Declining a request is not a failure of service - it is the governance framework working as designed. A platform that approves everything is not practising medicine; it is dispensing.",
    ],
  },
  {
    id: "patient-safety-and-escalation",
    icon: "heart",
    title: "Patient safety and escalation",
    paragraphs: [
      "Patient safety in telehealth depends on knowing what you can and cannot assess remotely. Our intake forms are designed to identify red-flag symptoms - clinical indicators that suggest the patient needs in-person assessment rather than telehealth management. Chest pain, sudden neurological symptoms, signs of serious infection, and other emergency presentations are flagged automatically, and the patient is directed to call 000 or attend their nearest emergency department.",
      "When a doctor reviews a request and identifies concerns that do not require emergency care but do require further assessment, they decline the request with specific guidance. This might include recommending the patient see their regular GP for examination, attend a pathology service for blood tests, or consult a specialist. The doctor documents their reasoning, and the patient receives a clear explanation - not a generic rejection.",
      "Our escalation pathways are tiered. Emergency presentations are redirected immediately with clear instructions. Non-emergency clinical concerns result in a declined request with documented reasoning and a recommendation for alternative care. Complex cases that fall within our scope but require additional oversight are escalated to our Medical Director for review before a decision is communicated to the patient.",
      "We track escalation and decline rates as quality indicators. An unusually low decline rate would be as much cause for concern as an unusually high one - it could suggest that clinical boundaries are not being applied consistently. These metrics are reviewed quarterly by our Medical Director as part of the continuous improvement cycle.",
    ],
  },
  {
    id: "regulatory-framework",
    icon: "certificate",
    title: "Regulatory framework",
    paragraphs: [
      "InstantMed operates within the regulatory framework established by several Australian bodies. The Australian Health Practitioner Regulation Agency (AHPRA) registers and regulates all health practitioners in Australia - every doctor on our platform holds current, unrestricted AHPRA registration, which can be independently verified on the public register. AHPRA's codes of conduct and guidelines for technology-based consultations inform our clinical protocols directly.",
      "The Therapeutic Goods Administration (TGA) regulates the prescription and supply of therapeutic goods in Australia. Our prescribing protocols comply with TGA scheduling requirements, and our scope exclusions (particularly around Schedule 8 substances) reflect both TGA regulations and our own clinical risk assessment. The Pharmaceutical Benefits Scheme (PBS) guidelines inform our approach to repeat prescriptions, ensuring that subsidised medications are prescribed in accordance with PBS requirements.",
      "Our clinical governance is built around Australian medical regulation, privacy law, prescribing rules, documented scope boundaries, and the realities of asynchronous telehealth. We do not claim third-party college accreditation unless it has been formally granted.",
      "Patient privacy is governed by the Australian Privacy Principles (APPs) under the Privacy Act 1988. We collect only the health information necessary to provide the requested service, store it with field-level encryption, and do not share it with third parties except where required for clinical care or by law. Our privacy practices are documented in our Privacy Policy, and patients can request access to their health information at any time. The Fair Work Act 2009 is also relevant to our medical certificate service - certificates issued through InstantMed comply with the evidentiary requirements for workplace absence documentation.",
    ],
  },
]

/* ────────────────────────────── FAQs ────────────────────────────── */

const clinicalGovernanceFaqs = [
  {
    question: "Who reviews clinical protocols at InstantMed?",
    answer: "AHPRA-registered medical leadership designs and reviews the clinical protocols. Protocols are updated quarterly, or sooner when TGA, AHPRA, PBS, privacy, or other relevant requirements change. Protocol changes are version-controlled, documented with rationale, and audited for compliance.",
  },
  {
    question: "What are the practitioner qualifications?",
    answer: "Clinical reviews are performed by Australian AHPRA-registered doctors. Registration is current, independently verifiable on the AHPRA public register, and clinical work is conducted within the doctor's scope of training and against written protocols.",
  },
  {
    question: "How are clinical decisions audited?",
    answer: "Clinical decisions are audited through multiple mechanisms: random sampling of approved and declined requests, targeted review of escalated cases, thematic analysis of decision patterns over time, and review of all patient complaints with a clinical component. Audit findings are documented and feed into quarterly protocol reviews.",
  },
  {
    question: "What happens if a doctor makes a mistake?",
    answer: "Clinical incidents are managed through our incident reporting framework. Any adverse outcome or near-miss is logged, investigated, and reviewed by our Medical Director. Post-incident reviews identify root causes and result in documented process changes where warranted. Serious incidents are reported to AHPRA in accordance with mandatory notification requirements. We carry professional indemnity insurance covering all clinical services provided through the platform.",
  },
  {
    question: "How does InstantMed handle complaints?",
    answer: "Complaints can be submitted to complaints@instantmed.com.au and are acknowledged within 24 hours. Clinical complaints are reviewed by our Medical Director within 14 days. We maintain a formal complaints register, track resolution outcomes, and use complaint data to identify systemic issues. If a complaint cannot be resolved internally, patients can escalate to the Health Care Complaints Commission (HCCC) in their state or territory, or to AHPRA directly.",
  },
  {
    question: "Do you follow the same standards as regular GP clinics?",
    answer: "We use clinical governance, patient-safety, privacy, escalation, and documentation standards appropriate to asynchronous telehealth. We do not claim third-party college accreditation unless it has been formally granted. The key difference is context: telehealth needs extra governance around intake quality, remote-assessment limits, and when to send someone to in-person care.",
  },
  {
    question: "How do you ensure prescribing safety?",
    answer: "Prescribing safety is maintained through multiple layers: structured intake forms that capture medication history and contraindications, automated checks against our clinical protocols, doctor review of all prescribing decisions, and strict scope boundaries that exclude controlled substances and medications requiring physical monitoring. We only facilitate repeat prescriptions for medications the patient is already established on - we do not initiate new therapies for complex conditions.",
  },
  {
    question: "What clinical conditions do you NOT treat?",
    answer: "We do not treat emergency or life-threatening presentations, conditions requiring physical examination for diagnosis, mental health crises, conditions requiring Schedule 8 (controlled) medications, complex chronic disease management requiring ongoing monitoring, and paediatric patients without appropriate parental involvement. When a request falls outside our scope, we decline it with a clear explanation and a recommendation for appropriate alternative care.",
  },
  {
    question: "How often are your protocols updated?",
    answer: "Clinical protocols are formally reviewed quarterly. Updates occur sooner when triggered by TGA or AHPRA changes, post-incident reviews, emerging evidence relevant to our scope of practice, or regulatory changes. All protocol changes are version-controlled and documented with rationale before implementation.",
  },
  {
    question: "Is there a Medical Director overseeing care?",
    answer: "Yes. AHPRA-registered medical leadership provides clinical oversight across services. This includes protocol review, clinical audit, incident review, and alignment with AHPRA, TGA, PBS, privacy, and service-scope requirements.",
  },
  {
    question: "How do you handle conflicts of interest?",
    answer: "Clinicians on our platform are not incentivised to approve requests. There is no financial or performance benefit to approving rather than declining a request - the clinical decision stands on its own merits. When a request is declined for clinical reasons, the patient is refunded in full. Approval and decline rates are monitored as quality indicators, and any pattern suggesting inappropriate approval is investigated. This separation between commercial outcomes and clinical decisions is fundamental to safe telehealth practice.",
  },
  {
    question: "What data do you collect and how is it protected?",
    answer: "We collect only the health information necessary to assess your request - personal details, relevant medical history, current medications, and the reason for your consultation. This information is protected with AES-256-GCM field-level encryption at rest, transmitted over TLS, and stored in Australia on infrastructure that complies with the Australian Privacy Principles. We do not sell or share health information with third parties. Full details are available in our Privacy Policy.",
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
          subtitle="Our clinical processes are designed by practising GPs and reviewed regularly to ensure every patient interaction meets Australian standards."
          stats={heroStats}
        />

        {/* Page superpower — clinical-governance pages live or die on the
            "doctor-led, accountable" framing. Pull it forward as a claim. */}
        <ServiceClaimSection
          eyebrow="Doctor-led, doctor-accountable"
          headline={
            <>
              <span className="text-primary">Clinical decisions</span> stay with the clinician.
            </>
          }
          body="An AHPRA-registered Medical Director sets the protocols and reviews the edge cases. No business team overrides a clinical decline. The named, registered doctor on every certificate is the one accountable for it."
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
              The treating doctor&apos;s registration can be independently verified on
              the AHPRA public register. Clinical governance is documented through
              written protocols, audits, incident review, and escalation rules.
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
