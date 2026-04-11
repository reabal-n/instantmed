import { getApiAuth } from "@/lib/auth"
import { updateProfile } from "@/lib/data/profiles"
import { NextResponse } from "next/server"
import { requireValidCsrf } from "@/lib/security/csrf"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { z } from "zod"

const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  phone: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
})

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, "standard")
    if (rateLimitResponse) return rateLimitResponse

    const authResult = await getApiAuth()

    if (!authResult || authResult.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { fullName, phone, dateOfBirth } = parsed.data

    // Route through the canonical updateProfile() so PHI fields (phone, DOB)
    // are encrypted via encryptProfilePhi() before being written. Direct
    // supabase.from("profiles").update(...) bypasses encryption - see
    // launch blocker #3.
    const updated = await updateProfile(authResult.profile.id, {
      full_name: fullName,
      phone: phone ?? null,
      date_of_birth: dateOfBirth,
    })

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: updated.id,
        full_name: updated.full_name,
        phone: updated.phone,
        date_of_birth: updated.date_of_birth,
        updated_at: updated.updated_at,
      },
      message: "Profile updated successfully",
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
