import { getAllServicesAction } from "@/app/actions/admin-settings"

import { ServicesConfigClient } from "./services-client"

export const dynamic = "force-dynamic"

export default async function ServicesConfigPage() {
  const services = await getAllServicesAction().catch(() => [])

  return <ServicesConfigClient initialServices={services} />
}
