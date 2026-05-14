import { getAllEmailTemplatesAction } from "@/app/actions/admin-config"
import { requireRole } from "@/lib/auth/helpers"

import { EmailTemplateEditorClient } from "./email-template-editor-client"

export const dynamic = "force-dynamic"

export default async function EmailTemplatesPage() {
  await requireRole(["admin"])

  const templates = await getAllEmailTemplatesAction().catch(() => [])

  return <EmailTemplateEditorClient initialTemplates={templates} />
}
