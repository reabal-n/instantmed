import { ServicesConfigClient } from "./services-client"
import { getAllServicesAction } from "@/app/actions/admin-settings"

export const dynamic = "force-dynamic"

export default async function ServicesConfigPage() {
  const services = await getAllServicesAction().catch(() => [])

  return <ServicesConfigClient initialServices={services} />
}
