import { redirect, type RedirectType } from "next/navigation"

export const dynamic = "force-dynamic"

/**
 * Phase 2 of dashboard remaster (2026-05-12). `/doctor/dashboard` is now a
 * redirect to the canonical `/dashboard` URL. Preserves `status`, `page`,
 * `pageSize` query params so existing deep links keep working.
 *
 * Do not reintroduce a cockpit at this URL — `app/dashboard/page.tsx` is the
 * single source of truth. The 12-stat `IntakeMonitor` grid that lived here
 * was retired (kept alive only on `/admin/analytics` where stats belong).
 */
export default async function DoctorDashboardLegacyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      search.set(key, value)
    } else if (Array.isArray(value) && value.length > 0) {
      const first = value[0]
      if (typeof first === "string") search.set(key, first)
    }
  }
  const qs = search.toString()
  redirect(qs ? `/dashboard?${qs}` : "/dashboard", "replace" as RedirectType)
}
