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
      urgent_notice_enabled: flags.urgent_notice_enabled,
      urgent_notice_message: flags.urgent_notice_message,
      business_hours_open: flags.business_hours_open,
      business_hours_close: flags.business_hours_close,
      business_hours_timezone: flags.business_hours_timezone,
      business_hours_enabled: flags.business_hours_enabled,
    })
  } catch {
    // On error, return all services available (fail open for marketing)
    return NextResponse.json({
      maintenance_mode: false,
      disable_med_cert: false,
      disable_repeat_scripts: false,
      disable_consults: false,
      urgent_notice_enabled: false,
      urgent_notice_message: "",
      business_hours_open: 8,
      business_hours_close: 22,
      business_hours_timezone: "Australia/Sydney",
      business_hours_enabled: false,
    })
  }
}
