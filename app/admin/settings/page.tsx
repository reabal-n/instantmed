import { getFeatureFlags } from "@/lib/feature-flags"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { FeatureFlagsClient } from "./feature-flags-client"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
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
