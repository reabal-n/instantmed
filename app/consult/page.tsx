import type { Metadata } from 'next'
import { ServiceFunnelPage } from '@/components/marketing/service-funnel-page'
import { generalConsultFunnelConfig } from '@/lib/marketing/service-funnel-configs'
import { BreadcrumbSchema, MedicalServiceSchema } from '@/components/seo/healthcare-schema'

export const metadata: Metadata = {
  title: 'Online GP Consultation | Speak with a Doctor | InstantMed',
  description: 'A proper GP consult without the clinic visit. Australian doctors assess your health concerns and provide treatment advice, prescriptions, or referrals.',
  openGraph: {
    title: 'Online GP Consultation | InstantMed',
    description: 'A proper GP consult without the clinic visit. Australian doctors assess your health concerns.',
    type: 'website',
  },
}

export default function ConsultPage() {
  return (
    <>
      {/* SEO Structured Data */}
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "GP Consultation", url: "https://instantmed.com.au/consult" }
        ]} 
      />
      <MedicalServiceSchema 
        name="Online GP Consultation"
        description="A proper GP consult without the clinic visit. Australian doctors assess your health concerns and provide treatment advice."
        price="49.95"
      />
      <ServiceFunnelPage config={generalConsultFunnelConfig} />
    </>
  )
}
