import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Online Doctor Consultation | Speak with an Australian Doctor | InstantMed',
  description:
    'Book an online consultation with an AHPRA-registered Australian doctor. New prescriptions, complex health concerns, referrals. $49.95 flat fee.',
  alternates: {
    canonical: 'https://instantmed.com.au/consult',
  },
}

export default function GPConsultPage() {
  redirect('/consult')
}
