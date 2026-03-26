import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { generalConsultFunnelConfig } from '@/lib/marketing/service-funnel-configs'
import { getFeatureFlags } from '@/lib/feature-flags'
import { BreadcrumbSchema, MedicalServiceSchema, HowToSchema } from '@/components/seo/healthcare-schema'
import { MedCertRedirectBanner } from './med-cert-redirect-banner'

export const metadata: Metadata = {
  title: 'Online Doctor Consultation | Speak with an Australian Doctor',
  description: 'A proper doctor consult without the clinic visit. Australian AHPRA-registered doctors assess your health concerns and provide treatment advice, prescriptions, or referrals.',
  openGraph: {
    title: 'Online Doctor Consultation | InstantMed',
    description: 'A proper doctor consult without the clinic visit. Australian doctors assess your health concerns.',
    type: 'website',
    url: 'https://instantmed.com.au/consult',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Doctor Consultation | InstantMed',
    description: 'A proper doctor consult without the clinic visit. Australian doctors assess your health concerns.',
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
            text: "An AHPRA-registered GP reviews your information. They may call you to discuss further, or provide advice, a prescription, or referral directly.",
          },
        ]}
      />
      {/* Show contextual banner for med cert redirects */}
      {isFromMedCert && <MedCertRedirectBanner />}
      <ServiceFunnelPage config={generalConsultFunnelConfig} isDisabled={flags.disable_consults} />
    </>
  )
}
