import { getSuppressedEmails } from "@/app/actions/email-suppression"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"

import { EmailSuppressionClient } from "./email-suppression-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Email Suppression | InstantMed Doctor Portal",
}

export default async function EmailSuppressionPage() {
  await getAuthenticatedUserWithProfile()
  const { data, error } = await getSuppressedEmails()

  return <EmailSuppressionClient initialData={data} error={error} />
}
