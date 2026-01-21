import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { EmailTemplatesClient } from "./emails-client"
import { getAllEmailTemplatesAction } from "@/app/actions/admin-config"

export const dynamic = "force-dynamic"

export default async function EmailTemplatesPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const templates = await getAllEmailTemplatesAction()

  return <EmailTemplatesClient initialTemplates={templates} />
}
