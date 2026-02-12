import { redirect } from "next/navigation"

// email_delivery_log table has been removed. The canonical email
// management page is /admin/email-hub (uses email_outbox table).
export default function EmailQueuePage() {
  redirect("/admin/email-hub")
}
