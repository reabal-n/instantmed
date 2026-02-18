import { FeatureFlagsClient } from "./features-client"
import { getFeatureFlagsAction } from "@/app/actions/admin-config"
import { DEFAULT_FLAGS } from "@/lib/data/types/feature-flags"

export const dynamic = "force-dynamic"

export default async function FeatureFlagsPage() {
  const flags = await getFeatureFlagsAction().catch(() => DEFAULT_FLAGS)

  return <FeatureFlagsClient initialFlags={flags} />
}
