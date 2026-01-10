import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/observability/logger"

// Type for the raw Supabase response (patient is an array from join)
interface RequestRow {
  id: string
  type: string
  category: string | null
  subtype: string | null
  status: string
  script_sent: boolean
  script_sent_at: string | null
  clinical_note: string | null
  created_at: string
  updated_at: string
  patient: {
    full_name: string | null
    date_of_birth: string | null
    phone: string | null
    suburb: string | null
    state: string | null
  }[] | null
}

export async function GET() {
  try {
    // Verify doctor auth via Clerk
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Check if user is a doctor
    const { data: profile } = await supabase.from("profiles").select("role").eq("auth_user_id", userId).single()

    if (!profile || profile.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all requests with patient info
    const { data: requests, error } = await supabase
      .from("requests")
      .select(`
        id,
        type,
        category,
        subtype,
        status,
        script_sent,
        script_sent_at,
        clinical_note,
        created_at,
        updated_at,
        patient:profiles!requests_patient_id_fkey (
          full_name,
          date_of_birth,
          phone,
          suburb,
          state
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Convert to CSV
    const headers = [
      "Request ID",
      "Patient Name",
      "DOB",
      "Phone",
      "Location",
      "Category",
      "Subtype",
      "Status",
      "Script Sent",
      "Script Sent At",
      "Clinical Note",
      "Created At",
    ]

    const typedRequests = (requests || []) as RequestRow[]
    const rows = typedRequests.map((r) => {
      const patient = r.patient?.[0] || null
      return [
        r.id,
        patient?.full_name || "",
        patient?.date_of_birth || "",
        patient?.phone || "",
        `${patient?.suburb || ""}, ${patient?.state || ""}`,
        r.category || "",
        r.subtype || "",
        r.status,
        r.script_sent ? "Yes" : "No",
        r.script_sent_at || "",
        (r.clinical_note || "").replace(/"/g, '""'),
        r.created_at,
      ]
    })

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="instantmed-requests-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    logger.error("Export error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
