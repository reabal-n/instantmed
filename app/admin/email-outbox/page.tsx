import { redirect } from "next/navigation"

export default function EmailOutboxRedirect() {
  redirect("/doctor/admin/email-outbox")
}
