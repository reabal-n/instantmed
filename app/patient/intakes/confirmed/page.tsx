import { Suspense } from "react"
import { ConfirmedClient } from "./confirmed-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Request Confirmed | InstantMed",
  description: "Your request has been received and is being reviewed",
}

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string; email?: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4">
        <Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded-xl" />}>
          <ConfirmedClient requestId={params.request_id} email={params.email} />
        </Suspense>
      </div>
    </div>
  )
}
