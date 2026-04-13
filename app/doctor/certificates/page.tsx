import {
  type CertificateStatus,
  getAllIssuedCertificates,
} from "@/lib/data/issued-certificates"

import { CertificatesListClient } from "./certificates-list-client"

export const metadata = { title: "Certificates" }

export const dynamic = "force-dynamic"

const PAGE_SIZE = 50

const ALLOWED_STATUSES: CertificateStatus[] = ["valid", "revoked", "superseded", "expired"]
const ALLOWED_TYPES = ["work", "study", "carer"] as const

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    status?: string
    type?: string
    q?: string
  }>
}) {
  // Layout enforces doctor/admin role
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const status = ALLOWED_STATUSES.find((s) => s === params.status)
  const certificateType = ALLOWED_TYPES.find((t) => t === params.type)
  const search = params.q?.trim() || undefined

  const { data, total } = await getAllIssuedCertificates({
    status,
    certificateType,
    search,
    limit: PAGE_SIZE,
    offset,
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <CertificatesListClient
      certificates={data}
      currentPage={page}
      totalPages={totalPages}
      total={total}
      initialStatus={status ?? "all"}
      initialType={certificateType ?? "all"}
      initialSearch={search ?? ""}
    />
  )
}
