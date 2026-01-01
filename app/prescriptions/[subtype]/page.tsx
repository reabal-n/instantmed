import { redirect } from "next/navigation"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { getOptionalAuth, checkOnboardingRequired } from "@/lib/auth"
import { PrescriptionFlowClient } from "./prescription-flow-client"

const validSubtypes = ["repeat", "chronic"]
const subtypeMapping: Record<string, string> = {
  repeat: "repeat",
  chronic: "chronic",
}

const subtypeInfo: Record<string, { title: string; description: string }> = {
  repeat: {
    title: "Repeat Prescription",
    description: "Quick repeat for stable, existing medications",
  },
  chronic: {
    title: "Ongoing Medication Review",
    description: "For chronic medications needing dose adjustment, side effects review, or adding a new med",
  },
}

export default async function PrescriptionSubtypePage({
  params,
}: {
  params: Promise<{ subtype: string }>
}) {
  const { subtype } = await params

  if (!validSubtypes.includes(subtype)) {
    redirect("/prescriptions")
  }

  const authUser = await getOptionalAuth()
  const info = subtypeInfo[subtype]
  const dbSubtype = subtypeMapping[subtype] || subtype

  const needsOnboarding = authUser ? await checkOnboardingRequired(authUser) : false

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant={authUser ? "patient" : "marketing"} userName={authUser?.profile.full_name} />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 bg-gradient-subtle">
        <div className="mx-auto max-w-3xl">
          <PrescriptionFlowClient
            category="prescription"
            subtype={dbSubtype}
            title={info.title}
            description={info.description}
            patientId={authUser?.profile.id || null}
            isAuthenticated={!!authUser}
            needsOnboarding={needsOnboarding}
            userEmail={authUser?.user.email ?? undefined}
            userName={authUser?.profile.full_name}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
