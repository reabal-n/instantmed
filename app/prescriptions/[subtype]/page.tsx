import { redirect } from "next/navigation"

/**
 * /prescriptions/[subtype] now redirects to the unified /request flow
 * Maps legacy subtypes to unified service types
 */
export default async function PrescriptionSubtypePage({
  params,
}: {
  params: Promise<{ subtype: string }>
}) {
  const { subtype } = await params

  // Map subtypes to unified flow
  const serviceMap: Record<string, string> = {
    repeat: "repeat-script",
    chronic: "repeat-script",
    "repeat-script": "repeat-script",
    "new": "consult",
    "new-medication": "consult",
  }

  const service = serviceMap[subtype] || "repeat-script"
  redirect(`/request?service=${service}`)
}
