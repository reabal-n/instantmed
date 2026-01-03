import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_request: Request) {
  try {
    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser || authUser.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Get invoices for this patient
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("customer_id", authUser.profile.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      invoices: invoices || [],
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    )
  }
}
