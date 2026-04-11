import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getFollowup } from "@/app/actions/followups"
import { FollowupForm } from "./followup-form"

export const metadata = { title: "Treatment check-in - InstantMed" }
export const dynamic = "force-dynamic"

export default async function PatientFollowupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const auth = await getAuthenticatedUserWithProfile()
  if (!auth) redirect(`/sign-in?redirect_url=/patient/followups/${id}`)

  const followup = await getFollowup(id)
  if (!followup) notFound()

  if (followup.completed_at) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-semibold mb-2">Thanks - we've got it</h1>
        <p className="text-muted-foreground">
          Your check-in was submitted. Your doctor will review it shortly.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <FollowupForm
        followupId={followup.id}
        subtype={followup.subtype as "ed" | "hair_loss"}
        milestone={followup.milestone as "month_3" | "month_6" | "month_12"}
      />
    </div>
  )
}
