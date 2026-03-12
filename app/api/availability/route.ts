import { NextResponse } from "next/server"
import { getFeatureFlags } from "@/lib/feature-flags"

export const revalidate = 30

/**
 * GET /api/availability
 * Public endpoint returning service availability flags.
 * No auth required — used by marketing components (service picker, navbar).
 * Response is cached via getFeatureFlags (30s TTL).
 */
export async function GET() {
  try {
    const flags = await getFeatureFlags()
    return NextResponse.json({
      maintenance_mode: flags.maintenance_mode,
      disable_med_cert: flags.disable_med_cert,
      disable_repeat_scripts: flags.disable_repeat_scripts,
      disable_consults: flags.disable_consults,
    })
  } catch {
    // On error, return all services available (fail open for marketing)
    return NextResponse.json({
      maintenance_mode: false,
      disable_med_cert: false,
      disable_repeat_scripts: false,
      disable_consults: false,
    })
  }
}
