import { UnifiedFlowClient } from "./unified-flow-client"

export const metadata = {
  title: "Get Started | InstantMed",
  description: "Start your telehealth consultation with InstantMed. Medical certificates, prescriptions, and referrals from AHPRA-registered doctors.",
}

export default function StartPage() {
  return <UnifiedFlowClient />
}
