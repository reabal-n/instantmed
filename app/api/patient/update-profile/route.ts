import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser || authUser.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      fullName,
      phone,
      dateOfBirth,
    } = body

    if (!fullName || !dateOfBirth) {
      return NextResponse.json(
        { error: "Full name and date of birth are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update patient profile
    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        date_of_birth: dateOfBirth,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.profile.id)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: updated,
      message: "Profile updated successfully",
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}
