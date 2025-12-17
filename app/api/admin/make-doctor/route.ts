import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// Hardcoded admin emails that can be upgraded
const ALLOWED_EMAILS = ["me@reabal.ai", "admin@instantmed.com.au"]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")?.toLowerCase()

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    return NextResponse.json(
      { error: "Unauthorized email" },
      { status: 403 }
    )
  }

  try {
    const supabase = createServiceClient()

    // First, find the profile
    const { data: profiles, error: findError } = await supabase
      .from("profiles")
      .select("id, email, role")
      .ilike("email", email)

    if (findError) {
      console.error("Error finding profile:", findError)
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
      console.error("Error updating profile:", error)
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
  } catch (err) {
    console.error("Unexpected error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
