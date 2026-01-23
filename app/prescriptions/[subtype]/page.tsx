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
    repeat: "prescription",
    chronic: "prescription",
  }

  const service = serviceMap[subtype] || "prescription"
  redirect(`/request?service=${service}`)
}
