import PatientRequestDetailPageClient from "./client"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = params
  return {
    title: `Request ${id.slice(0, 8)} | InstantMed`,
    description: "View the status and details of your medical request.",
  }
}

export default function PatientRequestDetailPage({
  params,
  searchParams,
}: { params: { id: string }; searchParams: { retry?: string } }) {
  return <PatientRequestDetailPageClient params={params} searchParams={searchParams} />
}
