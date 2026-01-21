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
  )?.emailAddress

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

  // If no profile, create one
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
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("[api/profile/ensure] Profile creation failed:", insertError.message)
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
    }
    
    profile = newProfile
  }

  return NextResponse.json({ profileId: profile?.id })
}
