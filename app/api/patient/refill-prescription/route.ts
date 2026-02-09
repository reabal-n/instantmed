import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { auth as _auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { z } from "zod"

const refillSchema = z.object({
  prescription_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
})

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser || authUser.profile.role !== "patient") {
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

    const supabase = createServiceRoleClient()

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
