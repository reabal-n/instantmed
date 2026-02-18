import { requireRole } from "@/lib/auth"
import { getAllActiveTemplates } from "@/lib/data/certificate-templates"
import { TemplateStudioClient } from "./studio-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Template Studio | Admin",
  description: "Configure medical certificate templates",
}

export default async function TemplateStudioPage() {
  const authUser = await requireRole(["admin"])

  // Get all active templates
  const templates = await getAllActiveTemplates().catch(() => [])

  return (
    <TemplateStudioClient
      initialTemplates={templates}
      adminName={authUser.profile.full_name || "Admin"}
    />
  )
}
