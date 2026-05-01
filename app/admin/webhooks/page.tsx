import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function LegacyWebhooksPage() {
  redirect("/admin/webhook-dlq")
}
