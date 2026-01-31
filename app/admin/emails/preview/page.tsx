import { Suspense } from "react"
import { EmailPreviewReactClient } from "./email-preview-react-client"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Email Template Preview | Admin",
  description: "Preview and test email templates",
}

export default function EmailPreviewPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Template Preview</h1>
        <p className="text-muted-foreground">
          Preview and test email templates before sending
        </p>
      </div>
      
      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <EmailPreviewReactClient />
      </Suspense>
    </div>
  )
}
