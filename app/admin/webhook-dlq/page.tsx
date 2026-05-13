import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"

import { WebhookDlqClient } from "./webhook-dlq-client"

export const dynamic = "force-dynamic"

export default async function WebhookDlqPage() {
  await requireRole(["admin", "support"], { redirectTo: "/admin/ops" })

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Payment webhooks"
        description="Retry or resolve failed payment webhook events."
        backHref="/admin/ops"
      />
      <OperatorScrollArea>
        <WebhookDlqClient />
      </OperatorScrollArea>
    </OperatorPage>
  )
}
