import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"

export async function PATCH(request: Request) {
  try {
    // TODO: Implement CSRF protection with proper token endpoint
    // Currently disabled until client-side token support is added

    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { full_name, phone, street_address, suburb, state, postcode } = body

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name,
        phone,
        street_address,
        suburb,
        state,
        postcode,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
