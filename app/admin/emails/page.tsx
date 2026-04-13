import { getAllEmailTemplatesAction } from "@/app/actions/admin-config"

import { EmailTemplateEditorClient } from "./edit/email-template-editor-client"

export const dynamic = "force-dynamic"

export default async function EmailTemplatesPage() {
  const templates = await getAllEmailTemplatesAction().catch(() => [])

  return <EmailTemplateEditorClient initialTemplates={templates} />
}
