import { redirect } from "next/navigation"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { getOptionalAuth, checkOnboardingRequired } from "@/lib/auth"
import { SubtypeFlowClient } from "./subtype-flow-client"

const validSubtypes = ["work", "uni", "carer"]

const subtypeInfo: Record<string, { title: string; description: string }> = {
  work: {
    title: "Work Certificate",
    description: "Medical certificate for sick leave from work",
  },
  uni: {
    title: "Uni/School Certificate",
    description: "Medical certificate for special consideration",
  },
  carer: {
    title: "Carer's Leave Certificate",
    description: "Medical certificate for caring responsibilities",
  },
}

export default async function MedicalCertificateSubtypePage({
  params,
}: {
  params: Promise<{ subtype: string }>
}) {
  const { subtype } = await params

  if (!validSubtypes.includes(subtype)) {
    redirect("/medical-certificate")
  }

  const authUser = await getOptionalAuth()
  const info = subtypeInfo[subtype]

  const needsOnboarding = authUser ? await checkOnboardingRequired(authUser) : false

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant={authUser ? "patient" : "marketing"} userName={authUser?.profile.full_name} />
      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8 bg-gradient-subtle">
        <div className="mx-auto max-w-3xl">
          <SubtypeFlowClient
            category="medical_certificate"
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
