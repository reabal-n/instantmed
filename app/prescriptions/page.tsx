export const revalidate = 86400

import type { Metadata } from 'next'
import { PrescriptionsLanding } from '@/components/marketing/prescriptions-landing'
import { PRESCRIPTION_FAQ } from '@/lib/data/prescription-faq'
import { BreadcrumbSchema, MedicalServiceSchema, PrescriptionHowToSchema, SpeakableSchema, FAQSchema } from '@/components/seo/healthcare-schema'

export const metadata: Metadata = {
  title: 'Online Repeat Medication | Same-Day eScript',
  description: 'Renew your regular medications online. Australian doctors review your request and send an eScript to your phone. Any pharmacy, same day. From $29.95.',
  openGraph: {
    title: 'Online Repeat Medication | InstantMed',
    description: 'Renew your regular medications online. Australian doctors review your request and send an eScript to your phone.',
    type: 'website',
    url: 'https://instantmed.com.au/prescriptions',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Repeat Medication | InstantMed',
    description: 'Renew your regular medications online. Australian doctors review your request and send an eScript to your phone.',
  },
  alternates: {
    canonical: 'https://instantmed.com.au/prescriptions',
  },
}

export default function PrescriptionsPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Repeat Medication", url: "https://instantmed.com.au/prescriptions" },
        ]}
      />
      <MedicalServiceSchema
        name="Online Repeat Medication"
        description="Renew your regular medications online. Reviewed by Australian registered doctors. eScript sent to your phone."
        price="29.95"
      />
      <PrescriptionHowToSchema />
      <SpeakableSchema
        name="Online Repeat Medication Australia"
        description="Renew your regular medications online. Australian registered doctors review your request and send an eScript to your phone. From $29.95."
        url="/prescriptions"
      />
      <FAQSchema faqs={[...PRESCRIPTION_FAQ]} />
      <PrescriptionsLanding />
    </>
  )
}
