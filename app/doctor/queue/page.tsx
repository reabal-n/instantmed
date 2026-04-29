import { redirect } from "next/navigation"

import { buildDoctorQueueRedirectHref } from "@/lib/dashboard/routes"

export const dynamic = "force-dynamic"

export default async function DoctorQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  redirect(buildDoctorQueueRedirectHref(await searchParams))
}
