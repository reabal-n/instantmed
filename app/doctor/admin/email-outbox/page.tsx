import { getEmailOutboxList, getDistinctEmailTypes, getEmailOutboxStats } from "@/lib/data/email-outbox"
import { EmailOutboxClient } from "./email-outbox-client"

export const metadata = { title: "Email Outbox" }

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
  // Layout enforces doctor/admin role
  const params = await searchParams
  const page = parseInt(params.page || "1", 10)
  const pageSize = 50

  const filters = {
    status: params.status,
    email_type: params.email_type,
    to_email: params.to_email,
    intake_id: params.intake_id,
  }

  // Fetch data in parallel — degrade gracefully if a query fails
  const [listSettled, emailTypesSettled, statsSettled] = await Promise.allSettled([
    getEmailOutboxList({ page, pageSize, filters }),
    getDistinctEmailTypes(),
    getEmailOutboxStats(),
  ])

  const listResult = listSettled.status === "fulfilled"
    ? listSettled.value
    : { data: [], total: 0, error: "Failed to load email outbox" }
  const emailTypes = emailTypesSettled.status === "fulfilled" ? emailTypesSettled.value : []
  const stats = statsSettled.status === "fulfilled"
    ? statsSettled.value
    : { total: 0, sent: 0, failed: 0, skipped_e2e: 0, pending: 0 }

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
