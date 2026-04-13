import { NextRequest, NextResponse } from "next/server"

import { applyRateLimit } from "@/lib/rate-limit/redis"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/** Escape ILIKE special characters to prevent wildcard injection */
function escapeIlike(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")
}

/**
 * POST /api/profile/ensure
 *
 * Ensures a profile exists for the current Supabase Auth user.
 * Creates one if it doesn't exist (fallback for trigger failures).
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    const supabaseAuth = await createClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const primaryEmail = user.email?.toLowerCase()
    if (!primaryEmail) {
      return NextResponse.json({ error: "No email found" }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Check if profile exists by auth_user_id
    let { data: profile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    // If no profile, check for guest profile to link by email
    if (!profile) {
      const { data: guestProfile } = await serviceClient
        .from("profiles")
        .select("id, auth_user_id")
        .ilike("email", escapeIlike(primaryEmail))
        .is("auth_user_id", null)
        .maybeSingle()

      if (guestProfile) {
        const fullName = user.user_metadata?.full_name
          || user.user_metadata?.name
          || primaryEmail.split('@')[0]

        const { data: linkedProfile, error: linkError } = await serviceClient
          .from("profiles")
          .update({
            auth_user_id: user.id,
            email: primaryEmail,
            full_name: fullName,
            first_name: user.user_metadata?.first_name || null,
            last_name: user.user_metadata?.last_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            email_verified: true,
            email_verified_at: new Date().toISOString(),
          })
          .eq("id", guestProfile.id)
          .select("id")
          .single()

        if (!linkError && linkedProfile) {
          profile = linkedProfile
        }
      }
    }

    // If still no profile, create one
    if (!profile) {
      const fullName = user.user_metadata?.full_name
        || user.user_metadata?.name
        || primaryEmail.split('@')[0]

      const { data: newProfile, error: insertError } = await serviceClient
        .from("profiles")
        .insert({
          auth_user_id: user.id,
          email: primaryEmail,
          full_name: fullName,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: 'patient',
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: raceProfile } = await serviceClient
            .from("profiles")
            .select("id")
            .eq("auth_user_id", user.id)
            .single()
          if (raceProfile) {
            profile = raceProfile
          }
        } else {
          return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
        }
      } else {
        profile = newProfile
      }
    }

    return NextResponse.json({ profileId: profile?.id })
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
