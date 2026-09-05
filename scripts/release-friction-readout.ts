import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import {
  buildReleaseFrictionReceipt,
  buildReleaseMeasurementWindows,
  parseReleaseFrictionArgs,
  readReleaseFrictionPeriod,
  RELEASE_FRICTION_USAGE,
  writeAggregateReceiptAtomic,
} from "@/lib/admin/release-friction-readout"

function createAggregateReadClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function main(): Promise<void> {
  const generatedAt = new Date()
  const options = parseReleaseFrictionArgs(process.argv.slice(2), {
    now: generatedAt,
  })
  const windows = buildReleaseMeasurementWindows({
    asOf: generatedAt,
    releaseAt: new Date(options.releaseAt),
    window: options.window,
  })
  const supabase = createAggregateReadClient()
  const [baseline, release] = await Promise.all([
    readReleaseFrictionPeriod(supabase, {
      asOf: new Date(windows.baseline.asOf),
      from: new Date(windows.baseline.from),
      to: new Date(windows.baseline.to),
    }),
    readReleaseFrictionPeriod(supabase, {
      asOf: new Date(windows.release.asOf),
      from: new Date(windows.release.from),
      to: new Date(windows.release.to),
    }),
  ])
  const receipt = buildReleaseFrictionReceipt({
    baseline,
    generatedAt,
    release,
    releaseAt: options.releaseAt,
    releaseSha: options.releaseSha,
    supportContacts: options.supportContacts,
    window: options.window,
  })
  if (options.output) await writeAggregateReceiptAtomic(options.output, receipt)
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`)
}

void main().catch(() => {
  process.stderr.write("Release friction readout failed. Check arguments and source availability.\n")
  process.stderr.write(`${RELEASE_FRICTION_USAGE}\n`)
  process.exitCode = 1
})
