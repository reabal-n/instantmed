import type { Metadata } from "next"
import ClinicalGovernanceClient from "./clinical-governance-client"
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema"

export const metadata: Metadata = {
  title: "Clinical Governance",
  description:
    "Learn how InstantMed maintains clinical standards through Medical Director oversight, RACGP-aligned protocols, and regular audits.",
  openGraph: {
    title: "Clinical Governance | InstantMed",
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
