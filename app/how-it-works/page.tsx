import type { Metadata } from 'next'
import { HowItWorksContent } from '@/components/marketing/how-it-works-content'

export const revalidate = 86400 // 24h ISR for marketing page

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'See how InstantMed works — submit your request, a doctor reviews it, and get your medical certificate or prescription delivered digitally.',
  alternates: {
    canonical: 'https://instantmed.com.au/how-it-works',
  },
}

export default function HowItWorksPage() {
  return <HowItWorksContent />
}
