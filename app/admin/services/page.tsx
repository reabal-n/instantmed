import { getAllServicesAction } from "@/app/actions/admin-settings"
import { requireRole } from "@/lib/auth/helpers"

import { ServicesConfigClient } from "./services-client"

export const dynamic = "force-dynamic"

export default async function ServicesConfigPage() {
  await requireRole(["admin"])

  const services = await getAllServicesAction().catch(() => [])

  return <ServicesConfigClient initialServices={services} />
}
