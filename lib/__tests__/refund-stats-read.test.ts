import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import { getRefundStatsRead } from "@/lib/data/refunds"

function refundStatsClient(result: { data: unknown[] | null; error: { message: string } | null }) {
  const query = {
    select: () => query,
    neq: async () => result,
  }

  return {
    from: () => query,
  } as unknown as SupabaseClient
}

describe("refund stats source quality", () => {
  it("returns unavailable rather than a trusted zero when the read fails", async () => {
    const read = await getRefundStatsRead(refundStatsClient({
      data: null,
      error: { message: "database unavailable" },
    }))

    expect(read).toEqual({
      availability: "unavailable",
      stats: null,
    })
  })
})
