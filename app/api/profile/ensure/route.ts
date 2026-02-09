import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

/**
 * POST /api/profile/ensure
 * 
 * Ensures a profile exists for the current Clerk user.
 * Creates one if it doesn't exist (fallback for webhook failures).
 */
export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const primaryEmail = user.emailAddresses.find(
      e => e.id === user.primaryEmailAddressId
    )?.emailAddress?.toLowerCase()

    if (!primaryEmail) {
      return NextResponse.json({ error: "No email found" }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Check if profile exists
    let { data: profile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .single()

    // If no profile by clerk_user_id, check for guest profile to link
    if (!profile) {
      const { data: guestProfile } = await serviceClient
        .from("profiles")
        .select("id, clerk_user_id")
        .ilike("email", primaryEmail)
        .or("clerk_user_id.is.null,clerk_user_id.eq.")
        .maybeSingle()

      if (guestProfile && (!guestProfile.clerk_user_id || guestProfile.clerk_user_id === "")) {
        // Link the guest profile to this Clerk user
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail.split('@')[0]
        const { data: linkedProfile, error: linkError } = await serviceClient
          .from("profiles")
          .update({
            clerk_user_id: userId,
            email: primaryEmail,
            full_name: fullName,
            first_name: user.firstName || null,
            last_name: user.lastName || null,
            avatar_url: user.imageUrl || null,
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
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || primaryEmail.split('@')[0]

      const { data: newProfile, error: insertError } = await serviceClient
        .from("profiles")
        .insert({
          clerk_user_id: userId,
          email: primaryEmail,
          full_name: fullName,
          first_name: user.firstName || null,
          last_name: user.lastName || null,
          avatar_url: user.imageUrl || null,
          role: 'patient',
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (insertError) {
        // Handle race condition — profile created by webhook concurrently
        if (insertError.code === '23505') {
          const { data: raceProfile } = await serviceClient
            .from("profiles")
            .select("id")
            .eq("clerk_user_id", userId)
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
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
