import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NotificationsClient } from "./notifications-client"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Notifications",
  description: "View your notifications and updates",
}

export default async function NotificationsPage() {
  const authUser = await requireRole(["patient"])

  const supabase = createServiceRoleClient()
  const profile = authUser.profile

  // Get all notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="max-w-2xl mx-auto">
      <NotificationsClient notifications={notifications || []} />
    </div>
  )
}
