import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { EmailHubClient } from "./email-hub-client"
import { Skeleton } from "@/components/ui/skeleton"
import { getEmailStats, getRecentEmailActivity } from "@/app/actions/email-stats"

export const dynamic = "force-dynamic"

export default async function EmailHubPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  // Fetch real email stats from database
  const [statsResult, activityResult] = await Promise.all([
    getEmailStats(),
    getRecentEmailActivity(10),
  ])

  return (
    <div className="container py-6 space-y-6">
      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <EmailHubClient 
          initialStats={statsResult.stats}
          initialActivity={activityResult.activity}
        />
      </Suspense>
    </div>
  )
}
