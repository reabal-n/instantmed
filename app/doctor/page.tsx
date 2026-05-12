import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

/**
 * Phase 2 of dashboard remaster (2026-05-12): redirect bare `/doctor` straight
 * to the canonical `/dashboard`. Was `/doctor/dashboard`, which itself
 * redirects to `/dashboard`; the old form burned an extra hop on every click.
 */
export default async function DoctorPage() {
  redirect("/dashboard")
}
