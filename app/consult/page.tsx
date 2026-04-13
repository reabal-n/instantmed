import type { Metadata } from 'next'

import { ConsultGuideSection } from '@/components/marketing/sections'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { BreadcrumbSchema, FAQSchema, HealthArticleSchema,HowToSchema, MedicalServiceSchema } from '@/components/seo/healthcare-schema'
import { PRICING_DISPLAY } from '@/lib/constants'
import { getFeatureFlags } from '@/lib/feature-flags'
import { generalConsultFunnelConfig } from '@/lib/marketing/service-funnel-configs'

import { MedCertRedirectBanner } from './med-cert-redirect-banner'

const consultFaqs = [
  { question: "Will the doctor call me?", answer: "No - this is an async service. The doctor reviews your questionnaire and responds in writing with advice, a prescription, or a referral. If they need more information they'll message you through the platform. No phone call required." },
  { question: "Can I get a prescription from a consult?", answer: "Yes. If the doctor determines medication is clinically appropriate, they'll send an eScript to your phone. You can collect it at any pharmacy." },
  { question: "What about referrals and pathology?", answer: "The doctor can provide referral letters and pathology requests if they believe further investigation is needed. These are included in your consultation fee." },
  { question: "How is this different from a GP visit?", answer: "You get the same quality of care from an AHPRA-registered GP - just without the waiting room. The main limitation is the doctor can't physically examine you, so some conditions may still need an in-person visit." },
  { question: "What if my issue needs in-person care?", answer: "If the doctor determines your concern requires a physical examination, they'll let you know and recommend seeing a GP in person. You'll receive a full refund." },
  { question: "What conditions can you treat online?", answer: "Skin conditions (with photos), UTIs, allergies, mental health concerns, medication reviews, minor infections, stable chronic conditions, and many more. If your concern requires physical examination, we'll let you know." },
  { question: "Is my consultation private?", answer: "Doctor-patient confidentiality applies fully. Your health information is encrypted and never shared with employers, insurers, or third parties. Since this is a private service, nothing appears on your Medicare claims history." },
  { question: "Can I send photos to the doctor?", answer: "Yes. For skin conditions, rashes, and other visual concerns, you can upload photos during the questionnaire. This helps the doctor make a more accurate assessment." },
  { question: "How long does it take?", answer: "Most consultations are complete within 1–2 hours of submitting your form. The doctor reviews your questionnaire and responds in writing - no waiting on hold or scheduling a call." },
  { question: "Do I need a Medicare card?", answer: "Medicare details are requested for identity verification and prescribing history, but this is a private service - no Medicare rebate is claimed and nothing appears on your Medicare statement." },
  { question: "Can I get a medical certificate from a consult?", answer: "Yes. If during the consultation the doctor determines you're unfit for work, they can issue a medical certificate as part of your consultation - no additional fee." },
  { question: "What about follow-up questions?", answer: "After your consultation, you can message the doctor with follow-up questions through our secure platform. This is included in your consultation fee." },
]

export const metadata: Metadata = {
  title: 'Online Doctor Consultation Australia',
  description: `Consult an AHPRA-registered Australian doctor online. Get treatment advice, prescriptions, or referrals without visiting a clinic. ${PRICING_DISPLAY.FROM_CONSULT}.`,
  openGraph: {
    title: 'Online Doctor Consultation Australia | InstantMed',
    description: 'Consult an AHPRA-registered Australian doctor online. Treatment advice, prescriptions, and referrals.',
    type: 'website',
    url: 'https://instantmed.com.au/consult',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Doctor Consultation Australia | InstantMed',
    description: 'Consult an AHPRA-registered Australian doctor online. Treatment advice, prescriptions, and referrals.',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/consult',
  },
}

interface ConsultPageProps {
  searchParams: Promise<{ 
    source?: string
    reason?: string
    intended_duration?: string 
  }>
}

export default async function ConsultPage({ searchParams }: ConsultPageProps) {
  const [params, flags] = await Promise.all([
    searchParams,
    getFeatureFlags(),
  ])
  const isFromMedCert = params.source === 'med_cert' && params.reason === 'extended_duration'
  
  return (
    <>
      {/* SEO Structured Data */}
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Doctor Consultation", url: "https://instantmed.com.au/consult" }
        ]} 
      />
      <MedicalServiceSchema
        name="Online Doctor Consultation"
        description="A proper doctor consult without the clinic visit. Australian doctors assess your health concerns and provide treatment advice."
        price="49.95"
      />
      <HowToSchema
        name="How to Get an Online Doctor Consultation in Australia"
        description="Consult with an AHPRA-registered GP online. Get treatment advice, prescriptions, or referrals without visiting a clinic."
        totalTime="PT120M"
        estimatedCost="49.95"
        steps={[
          {
            name: "Describe your health concern",
            text: "Tell us what you'd like to discuss with a doctor. Include your symptoms, how long you've had them, and any relevant medical history.",
          },
          {
            name: "Provide your details",
            text: "Enter your personal and Medicare details so the doctor can verify your identity and prescribe if needed.",
          },
          {
            name: "Doctor reviews and responds",
            text: "An AHPRA-registered GP reviews your questionnaire and responds in writing with advice, a prescription, or a referral - typically within 1–2 hours.",
          },
        ]}
      />
      <FAQSchema faqs={consultFaqs} />
      <HealthArticleSchema
        title="Online Doctor Consultation Australia"
        description="Consult an AHPRA-registered Australian doctor online. Get treatment advice, prescriptions, or referrals without visiting a clinic."
        url="/consult"
      />
      {/* Show contextual banner for med cert redirects */}
      {isFromMedCert && <MedCertRedirectBanner />}
      <ServiceFunnelPage config={generalConsultFunnelConfig} isDisabled={flags.disable_consults}>
        <ConsultGuideSection />
      </ServiceFunnelPage>
    </>
  )
}
