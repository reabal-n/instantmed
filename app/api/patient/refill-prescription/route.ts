import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { requireValidCsrf } from "@/lib/security/csrf"

interface RefillRequest {
  prescription_id: string
  quantity?: number
}

export async function POST(request: Request) {
  try {
    // CSRF protection
    const csrfError = await requireValidCsrf(request)
    if (csrfError) {
      return csrfError
    }

    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser || authUser.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: RefillRequest = await request.json()
    const { prescription_id, quantity = 1 } = body

    if (!prescription_id) {
      return NextResponse.json(
        { error: "Prescription ID is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify prescription belongs to patient
    const { data: prescription, error: prescriptionError } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("id", prescription_id)
      .eq("patient_id", authUser.profile.id)
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
        patient_id: authUser.profile.id,
        quantity_requested: quantity,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (refillError || !refill) {
      return NextResponse.json(
        { error: "Failed to create refill request" },
        { status: 500 }
      )
    }

    // Create notification for doctor
    await supabase.from("notifications").insert({
      user_id: prescription.prescriber_id,
      type: "prescription_refill_request",
      title: "Prescription Refill Request",
      message: `${authUser.profile.full_name} has requested a refill for ${prescription.medication_name}`,
      related_id: refill.id,
    })

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
    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser || authUser.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get patient's refill requests
    const { data: refills, error } = await supabase
      .from("prescription_refills")
      .select(
        `
        *,
        prescription:prescriptions(*)
      `
      )
      .eq("patient_id", authUser.profile.id)
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
