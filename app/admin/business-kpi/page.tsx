import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
export const metadata = { title: "Business KPIs" }

/**
 * /admin/business-kpi was a near-duplicate of the Analytics Hub. Phase 4
 * of the doctor + admin portal rebuild (2026-04-29) merged the content
 * into /admin/analytics as the "Business KPIs" tab so admins have a
 * single canonical entry for business intelligence.
 *
 * The route stays alive as a redirect so existing bookmarks, email
 * digest links, and external dashboards keep working.
 */
export default function BusinessKPIDashboardPage() {
  redirect("/admin/analytics?tab=business-kpis")
}
