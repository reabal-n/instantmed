import { getSuppressedEmails } from "@/app/actions/email-suppression"
import { requireRole } from "@/lib/auth/helpers"

import { EmailSuppressionClient } from "./email-suppression-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: { absolute: "Email Suppression | InstantMed Admin" },
}

export default async function EmailSuppressionPage() {
  await requireRole(["admin"], { redirectTo: "/doctor/dashboard" })
  const { data, error } = await getSuppressedEmails()

  return <EmailSuppressionClient initialData={data} error={error} />
}
