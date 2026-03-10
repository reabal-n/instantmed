import { Suspense } from "react"
import { EmailTestClient } from "./email-test-client"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

export default async function EmailTestPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <EmailTestClient />
      </Suspense>
    </div>
  )
}
