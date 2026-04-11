import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { getCurrentProfile, updateProfile } from "@/lib/data/profiles"
import type { AustralianState } from "@/types/db"
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

    // CSRF protection (matches the rest of /api/patient/* mutating routes)
    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    // getCurrentProfile() resolves the caller from auth session → profiles table.
    // Returns null if unauthenticated or profile missing.
    const profile = await getCurrentProfile()
    if (!profile) {
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

    // Build typed update payload - only include fields the client actually sent.
    // updateProfile() runs encryptProfilePhi() over phone/DOB before writing,
    // so this path stays compliant with PHI encryption requirements.
    const updates: Parameters<typeof updateProfile>[1] = {}

    if (full_name !== undefined && full_name !== null) updates.full_name = full_name
    if (phone !== undefined) updates.phone = phone || null
    // Support both field names from client (street_address is legacy, address_line1 is canonical)
    const addressValue = address_line1 !== undefined ? address_line1 : street_address
    if (addressValue !== undefined) updates.address_line1 = addressValue
    if (suburb !== undefined) updates.suburb = suburb
    if (state !== undefined) updates.state = state as AustralianState
    if (postcode !== undefined) updates.postcode = postcode
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth || null
    if (consent_myhr !== undefined) {
      ;(updates as Record<string, unknown>).consent_myhr = consent_myhr
    }

    const updated = await updateProfile(profile.id, updates)

    if (!updated) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    revalidatePath("/patient/settings")
    revalidatePath("/account")

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
