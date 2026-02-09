import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"

interface _IntakeRow {
  id: string
  service_id: string
  status: string
  is_priority: boolean
  doctor_notes: string | null
  created_at: string
  updated_at: string
  patient: {
    full_name: string | null
    date_of_birth: string | null
    phone: string | null
    suburb: string | null
    state: string | null
  }[] | null
  service: {
    name: string
    type: string
  }[] | null
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    const { data: profile } = await supabase.from("profiles").select("role").eq("clerk_user_id", userId).single()

    if (!profile || (profile.role !== "doctor" && profile.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
