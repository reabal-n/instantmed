import { redirect } from "next/navigation"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { getOptionalAuth, checkOnboardingRequired } from "@/lib/auth"
import { ReferralFlowClient } from "./referral-flow-client"

const validSubtypes = ["specialist", "pathology-imaging"]

const subtypeInfo: Record<string, { title: string; description: string }> = {
  specialist: {
    title: "Specialist Referral",
    description: "Get a referral to see a medical specialist",
  },
  "pathology-imaging": {
    title: "Pathology / Imaging Request",
    description: "Request blood tests, X-ray, ultrasound, CT, or MRI",
  },
}

export default async function ReferralSubtypePage({
  params,
}: {
  params: Promise<{ subtype: string }>
}) {
  const { subtype } = await params

  if (!validSubtypes.includes(subtype)) {
    redirect("/referrals")
  }

  const authUser = await getOptionalAuth()
  const info = subtypeInfo[subtype]

  const needsOnboarding = authUser ? await checkOnboardingRequired(authUser) : false

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant={authUser ? "patient" : "marketing"} userName={authUser?.profile.full_name} />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 bg-gradient-subtle">
        <div className="mx-auto max-w-3xl">
          <ReferralFlowClient
            category="referral"
            subtype={subtype}
            title={info.title}
            description={info.description}
            patientId={authUser?.profile.id || null}
            isAuthenticated={!!authUser}
            needsOnboarding={needsOnboarding}
            userEmail={authUser?.user.email}
            userName={authUser?.profile.full_name}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
