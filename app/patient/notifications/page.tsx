import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { NotificationsClient } from "./notifications-client"

export const metadata = {
  title: "Notifications",
  description: "View your notifications and updates",
}

export default async function NotificationsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in?redirect=/patient/notifications")
  }

  const supabase = await createClient()

  // Get profile with notification preferences using Clerk ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, first_name, notification_preferences")
    .eq("clerk_user_id", userId)
    .single()

  if (!profile) {
    redirect("/patient/onboarding")
  }

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
