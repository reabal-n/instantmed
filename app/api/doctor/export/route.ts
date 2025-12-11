import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Type for the joined request data from Supabase
interface RequestWithPatient {
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
  } | null
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Verify doctor auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a doctor
    const { data: profile } = await supabase.from("profiles").select("role").eq("auth_user_id", user.id).single()

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

    const typedRequests = (requests || []) as RequestWithPatient[]
    const rows = typedRequests.map((r) => [
      r.id,
      r.patient?.full_name || "",
      r.patient?.date_of_birth || "",
      r.patient?.phone || "",
      `${r.patient?.suburb || ""}, ${r.patient?.state || ""}`,
      r.category || "",
      r.subtype || "",
      r.status,
      r.script_sent ? "Yes" : "No",
      r.script_sent_at || "",
      (r.clinical_note || "").replace(/"/g, '""'),
      r.created_at,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="instantmed-requests-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
