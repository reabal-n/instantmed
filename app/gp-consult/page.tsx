import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: 'Online GP Consultation | Speak with an Australian Doctor | InstantMed',
  description:
    'Book an online consultation with an AHPRA-registered Australian GP. New prescriptions, complex health concerns, referrals. $49.95 flat fee.',
  alternates: {
    canonical: 'https://instantmed.com.au/consult',
  },
}

export default function GPConsultPage() {
  redirect('/consult')
}
