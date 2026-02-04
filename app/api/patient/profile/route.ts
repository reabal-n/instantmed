import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { revalidatePath } from "next/cache"
import { applyRateLimit } from "@/lib/rate-limit/redis"

export async function PATCH(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    const supabase = createServiceRoleClient()
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }
    const { 
      full_name, 
      phone, 
      street_address, 
      suburb, 
      state, 
      postcode,
      date_of_birth,
      emergency_contact_name,
      emergency_contact_phone,
      preferred_pharmacy_name,
      preferred_pharmacy_address,
      email_notifications,
      sms_notifications,
    } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined) updateData.full_name = full_name
    if (phone !== undefined) updateData.phone = phone
    if (street_address !== undefined) updateData.street_address = street_address
    if (suburb !== undefined) updateData.suburb = suburb
    if (state !== undefined) updateData.state = state
    if (postcode !== undefined) updateData.postcode = postcode
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth
    if (emergency_contact_name !== undefined) updateData.emergency_contact_name = emergency_contact_name
    if (emergency_contact_phone !== undefined) updateData.emergency_contact_phone = emergency_contact_phone
    if (preferred_pharmacy_name !== undefined) updateData.preferred_pharmacy_name = preferred_pharmacy_name
    if (preferred_pharmacy_address !== undefined) updateData.preferred_pharmacy_address = preferred_pharmacy_address
    if (email_notifications !== undefined) updateData.email_notifications = email_notifications
    if (sms_notifications !== undefined) updateData.sms_notifications = sms_notifications

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("clerk_user_id", clerkUserId)

    if (error) throw error

    revalidatePath("/patient/settings")
    revalidatePath("/account")

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
