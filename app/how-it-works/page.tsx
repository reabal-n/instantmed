import type { Metadata } from 'next'
import { HowItWorksContent } from '@/components/marketing/how-it-works-content'
import { BreadcrumbSchema, HowToSchema } from '@/components/seo/healthcare-schema'

export const revalidate = 86400 // 24h ISR for marketing page

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'See how InstantMed works — submit your request, a doctor reviews it, and get your medical certificate or medication delivered digitally.',
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
      <HowItWorksContent />
    </>
  )
}
