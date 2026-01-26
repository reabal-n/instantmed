import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { ServicesConfigClient } from "./services-client"
import { getAllServicesAction } from "@/app/actions/admin-settings"

export const dynamic = "force-dynamic"

export default async function ServicesConfigPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const services = await getAllServicesAction().catch(() => [])

  return <ServicesConfigClient initialServices={services} />
}
