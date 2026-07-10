import type { Metadata } from "next"

import { AccountClosedClient } from "@/app/auth/account-closed/account-closed-client"

export const metadata: Metadata = {
  title: "Account closed",
  description: "Your InstantMed account has been closed.",
}

export default function AccountClosedPage() {
  return <AccountClosedClient />
}
