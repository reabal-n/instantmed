import type { Metadata } from "next"

import { BreadcrumbSchema } from "@/components/seo"

import ClinicalGovernanceClient from "./clinical-governance-client"

export const metadata: Metadata = {
  title: "Clinical Governance | Medical Standards",
  description:
    "Medical Director oversight, RACGP-aligned protocols, and regular clinical audits. How InstantMed maintains Australian healthcare standards.",
  openGraph: {
    title: "Clinical Governance | Medical Standards | InstantMed",
    description:
      "Our clinical processes are designed by practising GPs and reviewed regularly to meet Australian standards.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/clinical-governance",
  },
}

export const revalidate = 86400

export default function Page() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Clinical Governance", url: "https://instantmed.com.au/clinical-governance" },
        ]}
      />
      <ClinicalGovernanceClient />
    </>
  )
}
