import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { revalidatePath } from "next/cache"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { z } from "zod"

const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  street_address: z.string().max(500).optional(),
  address_line1: z.string().max(500).optional(),
  suburb: z.string().max(200).optional(),
  state: z.string().max(50).optional(),
  postcode: z.string().max(10).optional(),
  date_of_birth: z.string().max(20).optional().nullable(),
  consent_myhr: z.boolean().optional(),
})

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

    let rawBody
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const parsed = profileUpdateSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const {
      full_name,
      phone,
      street_address,
      address_line1,
      suburb,
      state,
      postcode,
      date_of_birth,
      consent_myhr,
    } = parsed.data

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined && full_name !== null) updateData.full_name = full_name
    if (phone !== undefined) updateData.phone = phone || null
    // Support both field names from client (street_address is legacy, address_line1 is canonical)
    const addressValue = address_line1 !== undefined ? address_line1 : street_address
    if (addressValue !== undefined) updateData.address_line1 = addressValue
    if (suburb !== undefined) updateData.suburb = suburb
    if (state !== undefined) updateData.state = state
    if (postcode !== undefined) updateData.postcode = postcode
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth || null
    if (consent_myhr !== undefined) updateData.consent_myhr = consent_myhr

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
