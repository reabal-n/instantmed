import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAllActiveTemplates } from "@/lib/data/certificate-templates"
import { TemplateStudioClient } from "./studio-client"

export const metadata = {
  title: "Template Studio | Admin",
  description: "Configure medical certificate templates",
}

export default async function TemplateStudioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in?redirect=/admin/studio")
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("auth_user_id", user.id)
    .single()

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
