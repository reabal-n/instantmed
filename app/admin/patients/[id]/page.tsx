import { redirect, type RedirectType } from "next/navigation"

export const dynamic = "force-dynamic"

/**
 * Phase 4 of dashboard remaster (2026-05-12). `/admin/patients/[id]` is now
 * a redirect to `/doctor/patients/[id]`.
 *
 * The previous admin-only patient detail page (~471 lines, four-stat tile
 * row + three-card layout) duplicated the clinical surface that the doctor
 * page already renders. The "Open clinical file" CTA on the old admin page
 * already routed here; this collapses the redundancy without losing any
 * operator workflow — admin-specific actions (merge audit, payments, refunds)
 * are reachable from the operator nav.
 */
export default async function AdminPatientDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/doctor/patients/${id}`, "replace" as RedirectType)
}
