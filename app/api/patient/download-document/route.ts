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
    const intakeId = url.searchParams.get("intakeId") || url.searchParams.get("requestId")

    if (!intakeId) {
      return NextResponse.json(
        { error: "Intake ID is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: intake, error: intakeError } = await supabase
      .from("intakes")
      .select(`
        id,
        status,
        service:services!service_id ( name, type )
      `)
      .eq("id", intakeId)
      .eq("patient_id", authUser.profile.id)
      .single()

    if (intakeError || !intake) {
      return NextResponse.json(
        { error: "Intake not found" },
        { status: 404 }
      )
    }

    if (intake.status !== "approved" && intake.status !== "completed") {
      return NextResponse.json(
        { error: "Document is not yet available" },
        { status: 403 }
      )
    }

    const { data: document, error: storageError } = await supabase.storage
      .from("documents")
      .download(`intakes/${intakeId}/document.pdf`)

    if (storageError || !document) {
      return NextResponse.json(
        { error: "Document not found in storage" },
        { status: 404 }
      )
    }

    const serviceData = intake.service as unknown as { name: string; type: string } | null
    const filename = `${serviceData?.type || "document"}-${intake.id}.pdf`
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
