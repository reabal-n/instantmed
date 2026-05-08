import type { Metadata } from "next"

import OurDoctorsClient from "./our-doctors-client"

export const metadata: Metadata = {
  title: "Our Clinical Team | AHPRA-Registered Australian Practice",
  description:
    "InstantMed operates under AHPRA-registered medical governance. Requests are reviewed by Australian doctors with documented clinical standards and escalation rules.",
  openGraph: {
    title: "Our Clinical Team | InstantMed",
    description:
      "AHPRA-registered doctor review with independent registration verification via the AHPRA public register.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/our-doctors",
  },
}

export default async function OurDoctorsPage() {
  return <OurDoctorsClient />
}
