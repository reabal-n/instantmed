import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Repeat Prescription Online | Same-Day E-Script | InstantMed',
  description:
    'Request a repeat prescription online from AHPRA-registered Australian doctors. Same medication, same dose. E-script sent to your phone. $29.95.',
  alternates: {
    canonical: 'https://instantmed.com.au/prescriptions/repeat',
  },
}

export default function RepeatPrescriptionPage() {
  redirect('/prescriptions/repeat')
}
