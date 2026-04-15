import { StickerIcon } from "@/components/icons/stickers"
import type { Metadata } from "next"

import { CenteredHero } from "@/components/heroes"
import { MarketingFooter } from "@/components/marketing"
import { HowWeDecideGuideSection } from "@/components/marketing/sections"
import type { ChecklistItem, FeatureItem, ProcessStep } from "@/components/sections"
import {
  AccordionSection,
  CTABanner,
  FeatureGrid,
  IconChecklist,
  ProcessSteps,
} from "@/components/sections"
import { FAQSchema } from "@/components/seo"
import { Navbar } from "@/components/shared"

// =============================================================================
// FAQ DATA
// =============================================================================

const howWeDecideFaqs = [
  {
    question: "Does a real doctor review every request?",
    answer: "Yes, every single one. No automated approvals, no AI making clinical decisions. An AHPRA-registered doctor reviews your information and makes a clinical judgement - the same way they would in a face-to-face consultation.",
  },
  {
    question: "How long does the review take?",
    answer: "Most requests are reviewed within 1-2 hours during operating hours (8am-10pm AEST, 7 days). Some may take longer if the doctor needs to follow up with additional questions or if we're experiencing higher than usual demand.",
  },
  {
    question: "What if the doctor needs more information?",
    answer: "They'll contact you directly before making a decision. Better to ask than to assume. You'll receive a notification via email or SMS, and the doctor will wait for your response before finalising the review.",
  },
  {
    question: "Can I appeal a declined request?",
    answer: "You can contact us at support@instantmed.com.au with additional information. The doctor may reconsider based on new details, or we can explain the clinical reasoning behind the decision. Either way, you'll receive a full refund for any declined request.",
  },
  {
    question: "Do you use AI in the decision-making process?",
    answer: "AI assists with intake and information gathering - helping you describe your symptoms and organising your medical history for the doctor. All clinical decisions are made by human doctors. AI never approves, declines, or influences a clinical outcome.",
  },
  {
    question: "What happens to my data after the review?",
    answer: "Your information is securely stored with AES-256 encryption on Australian servers hosted by Supabase. Medical records are retained in accordance with Australian healthcare record-keeping requirements. We never sell or share your data with third parties.",
  },
  {
    question: "How do I know the process is fair?",
    answer: "Clinical decisions are audited regularly by our Medical Director. Doctors aren't incentivised to approve or decline - they're paid the same either way. This removes the financial pressure that can compromise clinical judgement in other models.",
  },
  {
    question: "What if I disagree with the doctor's decision?",
    answer: "Contact us at support@instantmed.com.au. Complaints are taken seriously and responded to within 48 hours. For formal clinical complaints, email complaints@instantmed.com.au - these are reviewed by our Medical Director within 14 days.",
  },
  {
    question: "Are your doctors insured?",
    answer: "Yes. All doctors maintain professional indemnity insurance, which is a requirement for AHPRA registration. This protects both the doctor and the patient in the event of an adverse outcome.",
  },
  {
    question: "How does this compare to seeing a GP in person?",
    answer: "The clinical standard is the same - our doctors follow the same guidelines and have the same obligations as any GP. The information available is different: we rely on your reported history rather than a physical examination. For straightforward presentations, history-based assessment is well-established and effective in medical practice.",
  },
]

export const metadata: Metadata = {
  title: "How Doctors Review Your Request | Our Process",
  description:
    "How AHPRA-registered doctors assess your request, why some are declined, and how we prioritise safety. Real medical judgment, not algorithms.",
  openGraph: {
    title: "How We Make Decisions | InstantMed",
    description:
      "Every request is reviewed by a real Australian doctor. Here's what they look at and how they decide.",
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
      "The same rules any doctor follows. Some things just need to be done in person. We don\u2019t bend on that.",
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
    description:
      "Every reviewer is an AHPRA-registered doctor. They put their name on every decision.",
  },
  {
    icon: <StickerIcon name="heart" size={48} />,
    title: "No pressure to approve",
    description:
      "Our doctors aren\u2019t paid to say yes. They\u2019re paid to get it right. Big difference.",
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
    title: "A doctor reviews your request",
    description:
      "Usually within a few hours. They look at everything you've shared and make a decision.",
  },
  {
    number: 2,
    title: "You hear back",
    description:
      "Approved? Your certificate or script is on its way. Declined? Full refund, no drama.",
  },
  {
    number: 3,
    title: "Questions? They'll ask",
    description:
      "If anything's unclear, the doctor reaches out before deciding. We don\u2019t guess.",
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
          title="Every request gets a real review"
          highlightWords={["real review"]}
          subtitle="No algorithms deciding your health. No rubber stamps. Just a doctor looking at your request and making a call - the same way they would if you were sitting across from them."
        />

        <FeatureGrid
          title="What the doctor looks at"
          subtitle="The same stuff they'd consider if you walked into a clinic. Nothing more, nothing less."
          features={reviewFactors}
          columns={2}
        />

        <IconChecklist
          title="Why some requests aren't approved"
          subtitle="It's not personal. It's a doctor doing their job properly. Here are the usual reasons."
          items={declineReasons}
        />

        <p className="mx-auto max-w-3xl text-center text-sm text-muted-foreground px-4 -mt-12 mb-8">
          If your request is declined, you get a{" "}
          <span className="font-medium text-foreground">full refund</span>. No
          hassle.
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
