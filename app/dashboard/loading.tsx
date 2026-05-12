import { SkeletonDashboard } from "@/components/ui/skeleton"

/**
 * Loading state for `/dashboard`, the canonical staff cockpit (Phase 2
 * of dashboard remaster, 2026-05-12). Renders the standard
 * `SkeletonDashboard` while `getStaffNavCounts`, `getSystemHealth`,
 * `getReviewQueue`, and the role-aware admin/doctor data fetches
 * resolve. Without this, the route blocks on a blank document until
 * the slowest fetch returns.
 */
export default function DashboardLoading() {
  return <SkeletonDashboard />
}
