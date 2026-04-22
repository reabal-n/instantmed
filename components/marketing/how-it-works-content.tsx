"use client"

import { StickerIcon } from "@/components/icons/stickers"

import { CenteredHero } from "@/components/heroes"
import { DoctorCredibility } from "@/components/marketing/doctor-credibility"
import { RegulatoryPartners } from "@/components/marketing/media-mentions"
import { DataDrivenGuideSection, type GuideSectionData } from "@/components/marketing/sections"
import { InformationalPageShell } from "@/components/marketing/shared/informational-page-shell"
import { CTABanner,FAQSection, FeatureGrid, Timeline } from "@/components/sections"
import { getPatientCount } from "@/lib/social-proof"

/* ────────────────────────────── Data ────────────────────────────── */

const processSteps = [
  {
    title: "Tell us what you need",
    description:
      "Pick your service and answer a few quick questions. Takes about 2 minutes. No account needed to get started.",
  },
  {
    title: "A real doctor reviews it",
    description:
      "An AHPRA-registered GP reviews your request and medical history. If they need more info, they\u2019ll reach out directly. Most reviews done within the hour.",
  },
  {
    title: "Get your document",
    description:
      "If approved: med cert emailed as PDF, medication sent to your phone for any pharmacy. If not approved, you get a full refund. No questions asked.",
  },
]

const features = [
  {
    icon: <StickerIcon name="clock" size={44} />,
    title: "Fast turnaround",
    description:
      "Most requests reviewed within hours. If we can't help, you get a full refund.",
  },
  {
    icon: <StickerIcon name="security-shield" size={44} />,
    title: "AHPRA registered",
    description:
      "All our doctors are registered with AHPRA. We checked.",
  },
  {
    icon: <StickerIcon name="wallet" size={44} />,
    title: "No subscriptions",
    description:
      "Pay per consult. No monthly fees, no hidden charges, no surprises.",
  },
  {
    icon: <StickerIcon name="sent" size={44} />,
    title: "Digital delivery",
    description:
      "Everything sent via email or SMS. No app to download, nothing to print.",
  },
]

const howItWorksGuide: GuideSectionData[] = [
  {
    id: "submission",
    icon: "checklist",
    title: "What happens when you submit a request",
    paragraphs: [
      "When you fill in our questionnaire, you're providing the same information you'd give a GP in a face-to-face consultation: your symptoms, how long you've had them, relevant medical history, and any medications you're taking. The form is structured to capture the clinical details a doctor needs to make an informed assessment.",
      "This isn't a rubber-stamp process. The doctor reads your responses, reviews your history if you've used the service before, and applies the same clinical judgement they would in a consulting room. If something doesn't add up or they need more information, they'll message you through the platform. If they determine your situation requires in-person care, they'll say so, and you get a full refund.",
    ],
  },
  {
    id: "clinical-standards",
    icon: "stethoscope",
    title: "The clinical standards behind the screen",
    paragraphs: [
      "Every doctor on InstantMed is registered with the Australian Health Practitioner Regulation Agency (AHPRA) and holds a current medical registration. They follow the same clinical standards as any GP clinic, because they are GPs. The Medical Board of Australia's guidelines on telehealth require the same duty of care, record-keeping, and clinical decision-making as in-person consultations.",
      "Our clinical governance framework includes regular auditing, peer review, and adherence to RACGP clinical guidelines. Doctors can decline to issue a certificate or prescription if it's not clinically appropriate, and they do. An approval rate below 100% is a feature, not a bug. It means the clinical judgement is genuine.",
    ],
  },
  {
    id: "service-types",
    icon: "medical-history",
    title: "Medical certificates vs prescriptions vs consultations",
    paragraphs: [
      "We offer three core services, each with a different clinical pathway. Medical certificates are for short-term illness; the doctor assesses whether your reported symptoms justify time off work or study. Repeat prescriptions are for medications you already take; the doctor confirms it's safe to continue and sends an eScript to your phone. General consultations are for new health concerns; the doctor reviews your questionnaire and responds in writing with treatment advice, prescriptions, or referrals as needed.",
      "The clinical rigour scales with the complexity. A medical certificate for a one-day cold is relatively straightforward. A general consultation about ongoing symptoms requires more assessment and may involve follow-up questions through the platform. A prescription for a medication you've been taking for years requires different checks than one for a new concern. The process adapts. The standard doesn't.",
    ],
  },
  {
    id: "scope",
    icon: "laptop",
    title: "What we can and can't do online",
    paragraphs: [
      "Telehealth works well for conditions where the diagnosis is primarily history-based: cold and flu, gastro, back pain, mental health concerns, medication renewals, skin conditions (with photos), UTIs, and similar. These are conditions where a GP's assessment relies on what you describe rather than what they can physically examine.",
      "We're upfront about what falls outside our scope. We can't prescribe Schedule 8 medications (opioids, stimulants, benzodiazepines). We won't issue medical certificates for WorkCover claims. Those require in-person examination. Conditions requiring blood tests, imaging, or physical examination (suspicious lumps, joint injuries, chest pain) should be seen face-to-face. If your situation needs in-person care, we'll tell you, and refund you.",
    ],
  },
  {
    id: "privacy",
    icon: "lock",
    title: "Your privacy and data security",
    paragraphs: [
      "Doctor-patient confidentiality applies fully to telehealth consultations. Your health information is encrypted with AES-256, the same standard used by banks, and is never shared with employers, insurers, or third parties without your explicit consent. Because this is a private service (not billed to Medicare), there's no record on your Medicare claims history.",
      "We comply with the Australian Privacy Principles (APPs 1-13) and the Privacy Act 1988. Your data is stored on Australian servers. You can request access to or deletion of your health records at any time.",
    ],
  },
]

const HOW_IT_WORKS_FAQ = [
  { question: "Is this a real doctor?", answer: "Yes. Every request is reviewed by an AHPRA-registered Australian GP. They're real doctors with real medical degrees and current registration, the same doctors who work in clinics and hospitals." },
  { question: "How long does it take?", answer: "Medical certificates are typically issued within 30 minutes, 24/7. Prescriptions and consultations are reviewed within 1-2 hours. Prescriptions and consultations are available 8am-10pm AEST, 7 days." },
  { question: "Will my employer accept an online medical certificate?", answer: "Yes. Certificates from AHPRA-registered doctors are legally valid under the Fair Work Act. They carry the same weight as certificates from in-person GP visits." },
  { question: "Do I need to be available for a call?", answer: "No. InstantMed is fully async. You submit your form, the doctor reviews it, and you get a written response. No need to be free at a specific time." },
  { question: "Do I need a Medicare card?", answer: "For medical certificates, no. For prescriptions and consultations, Medicare details are requested for identity and prescribing history verification, but this is a private service." },
  { question: "What if the doctor can't help me?", answer: "You get a full refund. If your situation requires in-person care or falls outside telehealth scope, the doctor will recommend appropriate next steps." },
  { question: "Is my information private?", answer: "Completely. Your health data is encrypted with bank-level security and never shared with employers, insurers, or anyone else without your consent." },
  { question: "Can I use this for my kids?", answer: "We primarily serve adults (18+). Minors may be assessed with parental consent for certain services, but complex paediatric cases should be seen by a GP in person." },
  { question: "How do I receive my documents?", answer: "Medical certificates are emailed as PDFs and available in your patient dashboard. Prescriptions are sent as eScripts via SMS. Take your phone to any pharmacy." },
  { question: "Is this available outside major cities?", answer: "Yes. InstantMed works anywhere in Australia with internet access. Regional, rural, and remote patients use our service regularly." },
  { question: "What hours are you open?", answer: "Medical certificates are available 24/7. Prescriptions and consultations: 8am-10pm AEST, 7 days including public holidays." },
  { question: "How is this different from calling a GP clinic?", answer: "No appointments, no waiting rooms, no phone queues. You submit when it suits you, and a doctor reviews it without you needing to be available at a specific time." },
]

const HIW_CONFIG = {
  analyticsId: "how-it-works" as const,
  sticky: false as const,
}

/* ────────────────────────────── Component ────────────────────────────── */

export function HowItWorksContent() {
  return (
    <InformationalPageShell config={HIW_CONFIG}>
      {() => (
        <>
        {/* Hero */}
        <CenteredHero
          pill="How It Works"
          title="Healthcare that fits your life"
          highlightWords={["your life"]}
          subtitle="Submit your request online. A real Australian doctor reviews it and determines the best way to help you. Convenient, but still thorough."
        />

        {/* Process Steps */}
        <Timeline
          pill="3 simple steps"
          title="Three steps. That's it."
          highlightWords={["steps"]}
          subtitle="No hidden steps, no surprises, no catch."
          steps={processSteps}
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
            items={HOW_IT_WORKS_FAQ}
          />
        </div>

        {/* CTA */}
        <CTABanner
          title="Ready when you are"
          subtitle={`Join ${getPatientCount().toLocaleString()}+ Australians who trust InstantMed. Pick what you need, fill in a quick form, and a GP takes care of the rest.`}
          ctaText="Get Med Cert"
          ctaHref="/request?service=med-cert"
          secondaryText="Renew medication"
          secondaryHref="/request?service=prescription"
        />
        </>
      )}
    </InformationalPageShell>
  )
}
