import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NotificationsClient } from "./notifications-client"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Notifications",
  description: "View your notifications and updates",
}

export default async function NotificationsPage() {
  // Layout enforces patient role — use cached profile
  const authUser = (await getAuthenticatedUserWithProfile())!

  const supabase = createServiceRoleClient()
  const profile = authUser.profile

  // Get all notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, message, action_url, read, metadata, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div>
      <NotificationsClient notifications={notifications || []} patientId={profile.id} />
    </div>
  )
}
