import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getAllActiveTemplates } from "@/lib/data/certificate-templates"
import { TemplateStudioClient } from "./studio-client"

export const metadata = {
  title: "Template Studio | Admin",
  description: "Configure medical certificate templates",
}

export default async function TemplateStudioPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in?redirect=/admin/studio")
  }

  // Check admin role
  const profile = authUser.profile

  if (!profile || profile.role !== "admin") {
    redirect("/")
  }

  // Get all active templates
  const templates = await getAllActiveTemplates()

  return (
    <TemplateStudioClient 
      initialTemplates={templates}
      adminName={profile.full_name || "Admin"}
    />
  )
}
