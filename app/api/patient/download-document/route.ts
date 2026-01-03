import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(_request: Request) {
  try {
    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser || authUser.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(_request.url)
    const requestId = url.searchParams.get("requestId")

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify request belongs to patient
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("*")
      .eq("id", requestId)
      .eq("patient_id", authUser.profile.id)
      .single()

    if (requestError || !request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      )
    }

    // Only approved requests can be downloaded
    if (request.status !== "approved") {
      return NextResponse.json(
        { error: "Document is not yet available" },
        { status: 403 }
      )
    }

    // Get document from storage
    const { data: document, error: storageError } = await supabase.storage
      .from("documents")
      .download(`requests/${requestId}/document`)

    if (storageError || !document) {
      return NextResponse.json(
        { error: "Document not found in storage" },
        { status: 404 }
      )
    }

    // Return document as blob
    const filename = `${request.type}-${request.id}.pdf`
    return new NextResponse(document, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    )
  }
}
