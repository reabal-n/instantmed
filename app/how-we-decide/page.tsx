import type { Metadata } from "next"

import { CenteredHero } from "@/components/heroes"
import { StickerIcon } from "@/components/icons/stickers"
import { CitationFacts } from "@/components/marketing/citation-facts"
import { MarketingFooter } from "@/components/marketing/marketing-footer"
import { HowWeDecideGuideSection } from "@/components/marketing/sections/how-we-decide-guide-section"
import { AccordionSection } from "@/components/sections/accordion-section"
import { CTABanner } from "@/components/sections/cta-banner"
import { FeatureGrid } from "@/components/sections/feature-grid"
import { IconChecklist } from "@/components/sections/icon-checklist"
import { ProcessSteps } from "@/components/sections/process-steps"
import type { ChecklistItem, FeatureItem, ProcessStep } from "@/components/sections/types"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared/navbar"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { GUARANTEE } from "@/lib/marketing/voice"

const AVAILABILITY_24_7 = getApprovedClaim("availability_24_7")
const CLINICAL_ACCESS_SCOPE = getApprovedClaim("clinical_access_scope")
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")
const COMPLAINTS_TIMING = getApprovedClaim("complaints_timing")
const DOCTOR_REGISTRATION = getApprovedClaim("doctor_registration")

// =============================================================================
// FAQ DATA
// =============================================================================

const howWeDecideFaqs = [
  {
    question: "Does a real doctor review every request?",
    answer: CLINICAL_DECISION_MODEL,
  },
  {
    question: "How long does the review take?",
    answer: AVAILABILITY_24_7,
  },
  {
    question: "What if the doctor needs more information?",
    answer: "They'll contact you directly before making a decision. Better to ask than to assume. You'll receive a notification via email or SMS, and the doctor will wait for your response before finalising the review.",
  },
  {
    question: "Can I appeal a declined request?",
    answer: `You can contact us at support@instantmed.com.au with additional information. The doctor may reconsider based on new details, or we can explain the clinical reasoning behind the decision. ${GUARANTEE}`,
  },
  {
    question: "Do you use AI in the decision-making process?",
    answer: "AI may assist with intake and information organisation. It does not prescribe. Eligible low-risk medical-certificate issuance uses a logged, deterministic doctor-owned protocol rather than an AI decision, and each certificate is individually reviewed afterward.",
  },
  {
    question: "What happens to my data after the review?",
    answer: `Medical records are retained in accordance with Australian healthcare record-keeping requirements. ${CLINICAL_ACCESS_SCOPE} Our privacy policy explains storage and the service providers needed to deliver care.`,
  },
  {
    question: "How do I know the process is fair?",
    answer: "Clinical outcomes and the information used to reach them are recorded. Business staff cannot override a clinical decline, and the complaints process provides a formal route to question a decision.",
  },
  {
    question: "What if I disagree with the doctor's decision?",
    answer: `Contact support@instantmed.com.au for help or complaints@instantmed.com.au to make a formal complaint. ${COMPLAINTS_TIMING}`,
  },
  {
    question: "Who performs clinical reviews?",
    answer: `${DOCTOR_REGISTRATION} Registration can be checked on the AHPRA public register.`,
  },
  {
    question: "How does this compare to seeing a GP in person?",
    answer: "The setting and information available are different. InstantMed relies on the history you provide and cannot perform a physical examination. Its documented pathways are limited to requests suitable for remote assessment; anything needing examination, testing, or ongoing care should move to an in-person service.",
  },
]

export const metadata: Metadata = {
  title: "How Doctors Review Your Request | Our Process",
  description:
    "How AHPRA-registered doctors assess prescribing requests, how the doctor-owned medical-certificate protocol works, and why some requests need more review.",
  openGraph: {
    title: "How We Make Decisions | InstantMed",
    description:
      "Prescribing decisions are made by Australian doctors. Eligible protocol-issued medical certificates are individually reviewed afterward.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/how-we-decide",
  },
}

const reviewFactors: FeatureItem[] = [
  {
    icon: <StickerIcon name="checklist" size={48} />,
    title: "What you've told us",
    description:
      "Your symptoms, how long you've been unwell, and anything else that helps paint the picture.",
  },
  {
    icon: <StickerIcon name="stethoscope" size={48} />,
    title: "Your medical background",
    description:
      "Conditions you've mentioned, medications you're on, and anything that might affect what's safe for you.",
  },
  {
    icon: <StickerIcon name="eye" size={48} />,
    title: "What you're asking for",
    description:
      "Whether it's a certificate, a script renewal, or something else - and whether that makes sense given everything above.",
  },
  {
    icon: <StickerIcon name="security-shield" size={48} />,
    title: "Clinical guidelines",
    description:
      "Documented service boundaries guide the review. Some things need to be done in person, and the pathway stops when they do.",
  },
]

const declineReasons: ChecklistItem[] = [
  {
    text: "You might need to be seen in person",
    subtext:
      "Some things really do need a physical exam. It\u2019s not us being difficult - it\u2019s just the nature of medicine.",
  },
  {
    text: "The medication needs monitoring",
    subtext:
      "Certain scripts require blood tests or regular check-ins. We can\u2019t skip those steps.",
  },
  {
    text: "Something sounds more serious",
    subtext:
      "If your symptoms suggest you should see someone urgently, we\u2019ll tell you. That\u2019s not a decline - that\u2019s looking out for you.",
  },
  {
    text: "We need more information",
    subtext:
      "Sometimes the answer is just \u2018tell us more.\u2019 The doctor might reach out before making a final call.",
  },
  {
    text: "It\u2019s outside what telehealth can do",
    subtext:
      "There are limits to what any doctor can safely do without seeing you. We work within them.",
  },
]

const safetyFeatures: FeatureItem[] = [
  {
    icon: <StickerIcon name="user-check" size={48} />,
    title: "Real doctors, real accountability",
    description: DOCTOR_REGISTRATION,
  },
  {
    icon: <StickerIcon name="heart" size={48} />,
    title: "No pressure to approve",
    description:
      "A business preference cannot override a clinical decline. The documented clinical outcome stands.",
  },
  {
    icon: <StickerIcon name="speech-bubble" size={48} />,
    title: "We reach out when it matters",
    description:
      "If something\u2019s unclear, the doctor will contact you. We\u2019d rather ask than assume.",
  },
  {
    icon: <StickerIcon name="info" size={48} />,
    title: "Honest about our limits",
    description:
      "If you need in-person care, we\u2019ll say so. We\u2019re not trying to handle everything, just the things we can do well.",
  },
]

const afterSubmitSteps: ProcessStep[] = [
  {
    number: 1,
    title: "Your request follows its service pathway",
    description: `${CLINICAL_REVIEW_SEQUENCE} ${AVAILABILITY_24_7}`,
  },
  {
    number: 2,
    title: "You receive an outcome or a question",
    description:
      `A doctor may ask for more information before a prescribing decision. Otherwise you receive an approval or decline. ${GUARANTEE}`,
  },
  {
    number: 3,
    title: "The outcome is recorded",
    description:
      "Approved documents or eScripts are delivered digitally. Declines and follow-up questions stay attached to the request record.",
  },
]

export default function HowWeDecidePage() {
  return (
    <>
      <FAQSchema faqs={howWeDecideFaqs} />
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        <CenteredHero
          pill="Our Process"
          title="Every request has clinical ownership"
          highlightWords={["clinical ownership"]}
          subtitle="Prescribing decisions are made by a doctor. Eligible low-risk medical certificates may follow a logged doctor-owned protocol, with individual review afterward."
        />

        <CitationFacts variant="muted" />

        <FeatureGrid
          title="What the doctor looks at"
          subtitle="The history you provide, the request you make, and the limits of remote assessment."
          features={reviewFactors}
          columns={2}
        />

        <IconChecklist
          title="Why some requests aren't approved"
          subtitle="It's not personal. It's a doctor doing their job properly. Here are the usual reasons."
          items={declineReasons}
        />

        <p className="mx-auto max-w-3xl text-center text-sm text-muted-foreground px-4 -mt-12 mb-8">
          {GUARANTEE}
        </p>

        <FeatureGrid
          title="Your safety comes first"
          subtitle="We'd rather lose a sale than cut corners on care. That's not marketing - it's just how we work."
          features={safetyFeatures}
          columns={2}
        />

        <ProcessSteps
          title="What happens after you submit"
          subtitle="No surprises. Here's exactly what to expect."
          steps={afterSubmitSteps}
        />

        <HowWeDecideGuideSection />

        <AccordionSection
          title="Common questions about our process"
          subtitle="Straight answers about how decisions are made, what happens to your data, and what to do if you disagree."
          groups={[{ items: howWeDecideFaqs }]}
        />

        <CTABanner
          title="Still have questions?"
          subtitle="We're happy to explain more. Our support team is real people who actually reply."
          ctaText="Get in touch"
          ctaHref="/contact"
          secondaryText="Read FAQs"
          secondaryHref="/faq"
        />
      </main>

      <MarketingFooter />
    </div>
    </>
  )
}
