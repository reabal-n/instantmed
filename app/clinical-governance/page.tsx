import type { Metadata } from "next"
import ClinicalGovernanceClient from "./clinical-governance-client"

export const metadata: Metadata = {
  title: "Clinical Governance",
  description:
    "Learn how InstantMed maintains clinical standards through Medical Director oversight, RACGP-aligned protocols, and regular audits.",
  openGraph: {
    title: "Clinical Governance | InstantMed",
    description:
      "Our clinical processes are designed by practising GPs and reviewed regularly to meet Australian standards.",
  },
}

export const revalidate = 86400

export default function Page() {
  return <ClinicalGovernanceClient />
}
