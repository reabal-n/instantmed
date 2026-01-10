import { NextRequest, NextResponse } from "next/server"
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("route")
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const variant = searchParams.get("variant") || "doctor"

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Check auth via Supabase
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Array<{
    id: string
    type: "request" | "patient"
    title: string
    subtitle: string
    status?: string
    href: string
  }> = []

  try {
    if (variant === "doctor" || variant === "admin") {
      // Search requests with patient info
      const { data: requests } = await supabase
        .from("requests")
        .select(`
          id,
          category,
          subtype,
          status,
          created_at,
          patient:profiles!patient_id (
            id,
            full_name,
            medicare_number
          )
        `)
        .or(`patient.full_name.ilike.%${query}%,patient.medicare_number.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10)

      if (requests) {
        for (const req of requests) {
          const patientData = req.patient as unknown as { id: string; full_name: string; medicare_number?: string } | null
          if (patientData?.full_name?.toLowerCase().includes(query.toLowerCase()) ||
              patientData?.medicare_number?.includes(query)) {
            results.push({
              id: req.id,
              type: "request",
              title: patientData?.full_name || "Unknown Patient",
              subtitle: formatCategory(req.category) + (req.subtype ? ` - ${formatSubtype(req.subtype)}` : ""),
              status: req.status,
              href: `/doctor/intakes/${req.id}`,
            })
          }
        }
      }

      // Search patients directly
      const { data: patients } = await supabase
        .from("profiles")
        .select("id, full_name, medicare_number, created_at")
        .eq("role", "patient")
        .or(`full_name.ilike.%${query}%,medicare_number.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(5)

      if (patients) {
        for (const patient of patients) {
          // Avoid duplicates
          if (!results.some(r => r.title === patient.full_name && r.type === "patient")) {
            results.push({
              id: patient.id,
              type: "patient",
              title: patient.full_name,
              subtitle: patient.medicare_number ? `Medicare: ${maskMedicare(patient.medicare_number)}` : "Patient",
              href: `/doctor/patients/${patient.id}`,
            })
          }
        }
      }
    } else if (variant === "patient") {
      // Patient can only search their own requests
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (profile) {
        const { data: requests } = await supabase
          .from("requests")
          .select("id, category, subtype, status, created_at")
          .eq("patient_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (requests) {
          for (const req of requests) {
            const title = formatCategory(req.category)
            if (title.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                id: req.id,
                type: "request",
                title,
                subtitle: new Date(req.created_at).toLocaleDateString("en-AU"),
                status: req.status,
                href: `/patient/intakes/${req.id}`,
              })
            }
          }
        }
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    log.error("Search error", { error: String(error) })
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}

function formatCategory(category: string | null): string {
  if (!category) return "Request"
  const labels: Record<string, string> = {
    medical_certificate: "Medical Certificate",
    prescription: "Prescription",
    referral: "Referral",
  }
  return labels[category] || category
}

function formatSubtype(subtype: string | null): string {
  if (!subtype) return ""
  const labels: Record<string, string> = {
    work: "Work",
    uni: "University",
    carer: "Carer",
    repeat: "Repeat",
    chronic_review: "Chronic Review",
  }
  return labels[subtype] || subtype
}

function maskMedicare(medicare: string): string {
  const cleaned = medicare.replace(/\s/g, "")
  if (cleaned.length < 6) return medicare
  return `${cleaned.slice(0, 4)}••••${cleaned.slice(-2)}`
}
