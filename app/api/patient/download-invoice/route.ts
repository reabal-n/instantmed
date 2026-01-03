import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser || authUser.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const invoiceId = url.searchParams.get("invoiceId")

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify invoice belongs to patient
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("customer_id", authUser.profile.id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Get invoice PDF from storage
    const { data: pdf, error: storageError } = await supabase.storage
      .from("invoices")
      .download(`${authUser.profile.id}/${invoiceId}.pdf`)

    if (storageError || !pdf) {
      return NextResponse.json(
        { error: "Invoice PDF not found" },
        { status: 404 }
      )
    }

    // Return PDF
    const filename = `invoice-${invoice.number}.pdf`
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to download invoice" },
      { status: 500 }
    )
  }
}
