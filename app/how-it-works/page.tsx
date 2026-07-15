import type { Metadata } from 'next'

import { HowItWorksContent } from '@/components/marketing/how-it-works-content'
import { BreadcrumbSchema, FAQSchema, HowToSchema } from '@/components/seo/healthcare-schema'
import { getApprovedClaim } from '@/lib/marketing/approved-claims'
import { GUARANTEE } from '@/lib/marketing/voice'

export const revalidate = 86400 // 24h ISR for marketing page

const AVAILABILITY_24_7 = getApprovedClaim("availability_24_7")
const CLINICAL_DECISION_MODEL = getApprovedClaim("clinical_decision_model")
const DOCTOR_REGISTRATION = getApprovedClaim("doctor_registration")

const howItWorksFaqs = [
  { question: "Is this a real doctor?", answer: `${DOCTOR_REGISTRATION} ${CLINICAL_DECISION_MODEL}` },
  { question: "How long does it take?", answer: AVAILABILITY_24_7 },
  { question: "Can my employer use an online medical certificate as evidence?", answer: "Certificates from AHPRA-registered doctors can support workplace evidence requirements. Employer policies may vary." },
  { question: "Do I need a Medicare card?", answer: "For medical certificates - no. For prescriptions and consultations - Medicare details are requested so the doctor can verify your identity, but this is a private service and no Medicare rebate is claimed." },
  { question: "What if my request is declined?", answer: `${GUARANTEE} If your situation requires in-person care or falls outside what telehealth can safely manage, the doctor will recommend appropriate next steps.` },
  { question: "Is my information private?", answer: getApprovedClaim("clinical_access_scope") },
  { question: "How do I receive my documents?", answer: "Medical certificates are emailed as PDFs. Prescriptions are sent as eScripts via SMS - take your phone to any pharmacy. Consultation notes are available in your dashboard." },
  { question: "Is this available outside major cities?", answer: "Yes. Eligible adults can start a request from anywhere in Australia with internet access." },
  { question: "What hours are you open?", answer: AVAILABILITY_24_7 },
  { question: "How is this different from calling a GP clinic?", answer: "There is no appointment booking or waiting room. You submit the structured form when it suits you, and a doctor may call or message if more information is needed before a prescribing decision." },
  { question: "Can I use this for my kids?", answer: "No. InstantMed currently accepts patients aged 18 and over only. Contact your child's GP or another paediatric-capable service for assessment or school documentation." },
  { question: "What can't you do online?", answer: "We do not prescribe Schedule 8 controlled medicines, issue WorkCover certificates, or manage presentations requiring physical examination, urgent care, or complex ongoing monitoring. If the doctor declines, the full request fee and any priority fee are refunded." },
]

const howItWorksSteps = [
  {
    title: "Tell us what you need",
    description: "Pick your service and answer the relevant clinical questions. Takes about 3 minutes. No account needed to get started.",
  },
  {
    title: "The clinical pathway reviews it",
    description: `${CLINICAL_DECISION_MODEL} ${AVAILABILITY_24_7}`,
  },
  {
    title: "Get your outcome",
    description: `If approved, a medical certificate is emailed as a PDF or an eScript is sent to your phone. ${GUARANTEE}`,
  },
]

export const metadata: Metadata = {
  title: 'How It Works | Fill a Form, Get Reviewed, Done',
  description: 'Submit a focused request online through a doctor-owned clinical pathway, with digital delivery if approved. Three simple steps.',
  alternates: {
    canonical: 'https://instantmed.com.au/how-it-works',
  },
  openGraph: {
    title: 'How It Works | Fill a Form, Get Reviewed, Done',
    description: 'Submit a focused request online through a doctor-owned clinical pathway, with digital delivery if approved. Three simple steps.',
    url: 'https://instantmed.com.au/how-it-works',
    type: 'website',
  },
}

export default function HowItWorksPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "How It Works", url: "https://instantmed.com.au/how-it-works" },
        ]}
      />
      <HowToSchema
        name="How to Use InstantMed for Online Healthcare"
        description="Request a medical certificate, repeat prescription, or focused specialty assessment online in three simple steps. No appointment needed."
        steps={howItWorksSteps.map((step) => ({ name: step.title, text: step.description }))}
      />
      <FAQSchema faqs={howItWorksFaqs} />
      <HowItWorksContent faqs={howItWorksFaqs} processSteps={howItWorksSteps} />
    </>
  )
}
