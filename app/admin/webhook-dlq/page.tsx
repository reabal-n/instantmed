import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { WebhookDlqClient } from "./webhook-dlq-client"

export const dynamic = "force-dynamic"

export default async function WebhookDlqPage() {
  const { profile } = await requireAuth("doctor")
  
  if (!profile || profile.role !== "admin") {
    redirect("/doctor")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Webhook Dead Letter Queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and manage failed webhook events
        </p>
      </div>
      <WebhookDlqClient />
    </div>
  )
}
