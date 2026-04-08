import type { Metadata } from 'next'
import { HowItWorksContent } from '@/components/marketing/how-it-works-content'
import { BreadcrumbSchema, HowToSchema, FAQSchema } from '@/components/seo/healthcare-schema'

export const revalidate = 86400 // 24h ISR for marketing page

const howItWorksFaqs = [
  { question: "Is this a real doctor?", answer: "Yes. Every request is reviewed by an AHPRA-registered Australian GP. They're real doctors with real medical degrees and current registration — the same doctors who work in clinics and hospitals." },
  { question: "How long does it take?", answer: "Medical certificates are typically issued in under 30 minutes, 24/7. Prescriptions and consultations are reviewed within 1–2 hours — all async, no phone call required. Prescriptions and consultations are available 8am–10pm AEST, 7 days." },
  { question: "Will my employer accept an online medical certificate?", answer: "Yes. Certificates from AHPRA-registered doctors are legally valid under the Fair Work Act. They carry the same weight as certificates from in-person GP visits." },
  { question: "Do I need a Medicare card?", answer: "For medical certificates — no. For prescriptions and consultations — Medicare details are requested so the doctor can verify your identity, but this is a private service and no Medicare rebate is claimed." },
  { question: "What if the doctor can't help me?", answer: "You get a full refund. If your situation requires in-person care or falls outside what telehealth can safely manage, the doctor will recommend appropriate next steps." },
  { question: "Is my information private?", answer: "Completely. Your health data is encrypted with bank-level security and never shared with employers, insurers, or anyone else without your consent." },
  { question: "How do I receive my documents?", answer: "Medical certificates are emailed as PDFs. Prescriptions are sent as eScripts via SMS — take your phone to any pharmacy. Consultation notes are available in your dashboard." },
  { question: "Is this available outside major cities?", answer: "Yes. InstantMed works anywhere in Australia with internet access. Regional, rural, and remote patients use our service regularly." },
  { question: "What hours are you open?", answer: "Medical certificates are available 24/7. Prescriptions and consultations are available 8am–10pm AEST, 7 days a week including public holidays." },
  { question: "How is this different from calling a GP clinic?", answer: "No appointments, no waiting rooms, no phone queues. You submit your request when it suits you, and a doctor reviews it without you needing to be available at a specific time." },
  { question: "Can I use this for my kids?", answer: "We primarily serve adults (18+). Minors may be assessed with parental consent for certain services, but complex paediatric cases should be seen by a GP in person." },
  { question: "What can't you do online?", answer: "We can't prescribe Schedule 8 medications (opioids, stimulants, benzodiazepines), issue WorkCover certificates, or manage conditions requiring physical examination. If your situation needs in-person care, we'll tell you and refund you." },
]

export const metadata: Metadata = {
  title: 'How Online Doctor Consultations Work',
  description: 'Submit your request online, an AHPRA-registered doctor reviews it, and receive your medical certificate or eScript digitally. Three simple steps.',
  alternates: {
    canonical: 'https://instantmed.com.au/how-it-works',
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
        description="Get a medical certificate, prescription, or doctor consultation online in three simple steps. No appointment needed."
        totalTime="PT60M"
        steps={[
          {
            name: "Tell us what you need",
            text: "Pick your service and answer a few quick questions about your health concern. Takes about 2 minutes. No account needed to get started.",
          },
          {
            name: "A real doctor reviews it",
            text: "An AHPRA-registered GP reviews your request and medical history. If they need more info, they'll reach out directly. Most reviews done within the hour.",
          },
          {
            name: "Get your document",
            text: "If approved: medical certificate emailed as PDF, or prescription sent to your phone as an eScript for any pharmacy. If not approved, you get a full refund.",
          },
        ]}
      />
      <FAQSchema faqs={howItWorksFaqs} />
      <HowItWorksContent />
    </>
  )
}
