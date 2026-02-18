import { getApiAuth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createLogger } from "@/lib/observability/logger"
import { z } from "zod"

const log = createLogger("refill-prescription")

const refillSchema = z.object({
  prescription_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
})

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    const authResult = await getApiAuth()

    if (!authResult || authResult.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = refillSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }
    const { prescription_id, quantity } = parsed.data

    const supabase = createServiceRoleClient()

    // Verify prescription belongs to patient
    const { data: prescription, error: prescriptionError } = await supabase
      .from("prescriptions")
      .select("id, patient_id, status, prescriber_id, medication_name")
      .eq("id", prescription_id)
      .eq("patient_id", authResult.profile.id)
      .single()

    if (prescriptionError || !prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      )
    }

    // Check if prescription is still valid
    if (prescription.status !== "active") {
      return NextResponse.json(
        { error: "Prescription is no longer active" },
        { status: 400 }
      )
    }

    // Create refill request
    const { data: refill, error: refillError } = await supabase
      .from("prescription_refills")
      .insert({
        prescription_id,
        patient_id: authResult.profile.id,
        quantity_requested: quantity,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (refillError || !refill) {
      return NextResponse.json(
        { error: "Failed to create refill request" },
        { status: 500 }
      )
    }

    // Create notification for doctor
    const { error: notifyError } = await supabase.from("notifications").insert({
      user_id: prescription.prescriber_id,
      type: "prescription_refill_request",
      title: "Prescription Refill Request",
      message: `${authResult.profile.full_name} has requested a refill for ${prescription.medication_name}`,
      related_id: refill.id,
    })

    if (notifyError) {
      log.warn("Failed to create refill notification for prescriber", { refillId: refill.id, error: notifyError.message })
    }

    return NextResponse.json(
      {
        success: true,
        refill,
        message: "Refill request submitted successfully",
      },
      { status: 201 }
    )
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process refill request" },
      { status: 500 }
    )
  }
}

export async function GET(_request: Request) {
  try {
    const authResult = await getApiAuth()

    if (!authResult || authResult.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get patient's refill requests
    const { data: refills, error } = await supabase
      .from("prescription_refills")
      .select(
        `
        id,
        prescription_id,
        patient_id,
        quantity_requested,
        status,
        requested_at,
        created_at,
        prescription:prescriptions(id, medication_name, status, dosage, frequency, prescriber_id, created_at)
      `
      )
      .eq("patient_id", authResult.profile.id)
      .order("requested_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch refill requests" },
        { status: 500 }
      )
    }

    return NextResponse.json({ refills })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch refill requests" },
      { status: 500 }
    )
  }
}
