import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
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
      .eq("auth_user_id", user.id)

    if (error) throw error

    revalidatePath("/patient/settings")
    revalidatePath("/account")

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
