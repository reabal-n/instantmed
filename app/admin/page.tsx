import { redirect } from "next/navigation"

// Prevent static generation for dynamic auth
// Note: Auth is handled by layout.tsx via requireRole(["admin"])

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  // Admin landing page redirects to analytics dashboard
  // Auth check is already done in layout.tsx
  redirect("/admin/analytics")
}
