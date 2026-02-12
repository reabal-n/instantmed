import { redirect } from "next/navigation"

// Consolidated: all email admin routes redirect to the Email Hub
export default function EmailOutboxRedirect() {
  redirect("/admin/email-hub")
}
