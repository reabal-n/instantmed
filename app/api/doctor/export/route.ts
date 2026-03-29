import { NextRequest, NextResponse } from "next/server"
import { requireApiRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"


export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiRole(["doctor", "admin"])
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = authResult

    const supabase = createServiceRoleClient()

    // Rate limit exports to prevent data scraping
    const rateLimitResponse = await applyRateLimit(request, "sensitive", userId)
    if (rateLimitResponse) return rateLimitResponse

    const { data: intakes, error } = await supabase
      .from("intakes")
      .select(`
        id,
        service_id,
        status,
        is_priority,
        doctor_notes,
        created_at,
        updated_at,
        patient:profiles!patient_id (
          full_name,
          date_of_birth,
          phone,
          suburb,
          state
        ),
        category
      `)
      .order("created_at", { ascending: false })
      .limit(10000)

    if (error) throw error

    const headers = [
      "Intake ID",
      "Patient Name",
      "DOB",
      "Phone",
      "Location",
      "Service",
      "Type",
      "Status",
      "Priority",
      "Doctor Notes",
      "Created At",
    ]

    const rows = (intakes || []).map((r: Record<string, unknown>) => {
      const patient = (r.patient as Record<string, unknown>[])?.[0] || null
      return [
        r.id,
        patient?.full_name || "",
        patient?.date_of_birth || "",
        patient?.phone || "",
        `${patient?.suburb || ""}, ${patient?.state || ""}`,
        r.category || "",
        r.category || "",
        r.status,
        r.is_priority ? "Yes" : "No",
        ((r.doctor_notes as string) || "").replace(/"/g, '""'),
        r.created_at,
      ]
    })

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="instantmed-intakes-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    logger.error("Export error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
