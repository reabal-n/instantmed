import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { EmailTestClient } from "./email-test-client"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

export default async function EmailTestPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="container py-6 space-y-6">
      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <EmailTestClient />
      </Suspense>
    </div>
  )
}
