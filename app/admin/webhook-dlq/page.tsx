import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"
import { STAFF_OPS_HREF } from "@/lib/dashboard/routes"

import { WebhookDlqClient } from "./webhook-dlq-client"

export const dynamic = "force-dynamic"

export default async function WebhookDlqPage() {
  await requireRole(["admin", "support"], { redirectTo: STAFF_OPS_HREF })

  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Payment webhooks"
        description="Retry or resolve failed payment webhook events."
        backHref={STAFF_OPS_HREF}
      />
      <OperatorScrollArea>
        <WebhookDlqClient />
      </OperatorScrollArea>
    </OperatorPage>
  )
}
