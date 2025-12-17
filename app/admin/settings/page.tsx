import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getFeatureFlags } from "@/lib/feature-flags"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { FeatureFlagsClient } from "./feature-flags-client"

const ADMIN_EMAILS = ["me@reabal.ai", "admin@instantmed.com.au"]

export default async function AdminSettingsPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login?redirect=/admin/settings")
  }

  const userEmail = authUser.user.email?.toLowerCase() || ""
  const isAdmin =
    ADMIN_EMAILS.includes(userEmail) ||
    authUser.profile.role === "admin" ||
    authUser.profile.role === "doctor"

  if (!isAdmin) {
    redirect("/patient")
  }

  const flags = await getFeatureFlags()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Kill Switches</h1>
          <p className="text-muted-foreground mt-2">
            Manage service availability and compliance controls. Changes take effect immediately.
          </p>
        </div>

        <FeatureFlagsClient initialFlags={flags} />
      </main>
      <Footer />
    </div>
  )
}
