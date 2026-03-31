export const revalidate = 86400

import type { Metadata } from 'next'
import { GeneralConsultLanding } from '@/components/marketing/general-consult-landing'
import { CONSULT_FAQ } from '@/lib/data/consult-faq'
import { BreadcrumbSchema, MedicalServiceSchema, SpeakableSchema, FAQSchema } from '@/components/seo/healthcare-schema'

export const metadata: Metadata = {
  title: 'Online GP Consultation | Talk to a Doctor Today',
  description: 'See an AHPRA-registered GP online for health concerns, treatment advice, prescriptions, and referrals. Same-day response. From $49.95.',
  openGraph: {
    title: 'Online GP Consultation | InstantMed',
    description: 'See an AHPRA-registered GP online. Treatment, prescriptions, and referrals. Same-day response.',
    type: 'website',
    url: 'https://instantmed.com.au/general-consult',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online GP Consultation | InstantMed',
    description: 'See an AHPRA-registered GP online. Treatment, prescriptions, and referrals.',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/general-consult',
  },
}

export default function GeneralConsultPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "General Consult", url: "https://instantmed.com.au/general-consult" },
        ]}
      />
      <MedicalServiceSchema
        name="Online GP Consultation"
        description="See an AHPRA-registered GP online for health concerns, treatment, prescriptions, and referrals."
        price="49.95"
      />
      <SpeakableSchema
        name="Online GP Consultation Australia"
        description="Talk to an AHPRA-registered GP about health concerns, treatment options, or anything you'd normally see a doctor for. From $49.95."
        url="/general-consult"
      />
      <FAQSchema faqs={[...CONSULT_FAQ]} />
      <GeneralConsultLanding />
    </>
  )
}
