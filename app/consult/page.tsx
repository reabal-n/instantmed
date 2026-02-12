import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { generalConsultFunnelConfig } from '@/lib/marketing/service-funnel-configs'
import { BreadcrumbSchema, MedicalServiceSchema } from '@/components/seo/healthcare-schema'
import { MedCertRedirectBanner } from './med-cert-redirect-banner'

export const metadata: Metadata = {
  title: 'Online Doctor Consultation | Speak with an Australian Doctor | InstantMed',
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
  const params = await searchParams
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
      {/* Show contextual banner for med cert redirects */}
      {isFromMedCert && <MedCertRedirectBanner />}
      <ServiceFunnelPage config={generalConsultFunnelConfig} />
    </>
  )
}
