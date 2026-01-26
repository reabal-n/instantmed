import { requireRole } from "@/lib/auth"
import { getEmailOutboxList, getDistinctEmailTypes, getEmailOutboxStats } from "@/lib/data/email-outbox"
import { EmailOutboxClient } from "./email-outbox-client"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    page?: string
    status?: string
    email_type?: string
    to_email?: string
    intake_id?: string
  }>
}

export default async function EmailOutboxPage({ searchParams }: PageProps) {
  // Require doctor or admin role
  await requireRole(["doctor", "admin"])

  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const pageSize = 50

  const filters = {
    status: params.status,
    email_type: params.email_type,
    to_email: params.to_email,
    intake_id: params.intake_id,
  }

  // Fetch data in parallel
  const [listResult, emailTypes, stats] = await Promise.all([
    getEmailOutboxList({ page, pageSize, filters }),
    getDistinctEmailTypes(),
    getEmailOutboxStats(),
  ])

  return (
    <EmailOutboxClient
      initialData={listResult.data}
      totalRows={listResult.total}
      currentPage={page}
      pageSize={pageSize}
      emailTypes={emailTypes}
      stats={stats}
      filters={filters}
      error={listResult.error}
    />
  )
}
