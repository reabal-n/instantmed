import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { isAdminEmail } from "@/lib/env"

// Only allow in development (NOT preview - security risk)
const IS_DEV = process.env.NODE_ENV === "development"

export async function GET(_request: Request) {
  // Block in production
  if (!IS_DEV) {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    )
  }

  // Require authentication using Clerk
  const { userId } = await auth()
  const user = await currentUser()
  
  if (!userId || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(_request.url)
  const email = searchParams.get("email")?.toLowerCase()
  const userEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress?.toLowerCase()

  if (!email || !isAdminEmail(email)) {
    return NextResponse.json(
      { error: "Unauthorized email" },
      { status: 403 }
    )
  }
  
  // Additional check: only allow self-upgrade
  if (userEmail !== email) {
    return NextResponse.json(
      { error: "Can only upgrade your own account" },
      { status: 403 }
    )
  }

  try {
    const supabase = createServiceRoleClient()

    // First, find the profile
    const { data: profiles, error: findError } = await supabase
      .from("profiles")
      .select("id, email, role")
      .ilike("email", email)

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { error: "No profile found for email: " + email, hint: "Make sure you've signed up first" },
        { status: 404 }
      )
    }

    // Update all matching profiles (should be just one)
    const { data, error } = await supabase
      .from("profiles")
      .update({ role: "doctor", onboarding_completed: true })
      .ilike("email", email)
      .select("id, email, role")

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Update failed for email: " + email },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${email} to doctor role`,
      profile: data,
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
