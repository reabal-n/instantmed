import { Suspense } from "react"
import { EmailQueueClient } from "./email-queue-client"

export const metadata = {
  title: "Email Queue | Admin",
}

export default function EmailQueuePage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Failed Email Delivery Queue</h1>
      <p className="text-muted-foreground mb-8">
        Review and retry failed certificate email deliveries.
      </p>
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <EmailQueueClient />
      </Suspense>
    </div>
  )
}
