import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmailPreviewReactClient } from "@/app/admin/emails/preview/email-preview-react-client"

export const metadata = {
  title: "Email Template Preview | Doctor Portal",
  description: "Preview email templates patients receive",
}

export default function DoctorEmailPreviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Template Preview</h1>
        <p className="text-muted-foreground">
          See exactly what patients receive for each email type. Edit the fields to preview with different data.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] rounded-lg" />}>
        <EmailPreviewReactClient />
      </Suspense>
    </div>
  )
}
