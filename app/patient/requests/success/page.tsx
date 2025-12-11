import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileText } from "lucide-react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { SuccessPageClient } from "./success-client"

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string; session_id?: string }>
}) {
  const params = await searchParams
  const requestId = params.request_id

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 pt-32 pb-20">
        <div className="container max-w-lg mx-auto px-4">
          <SuccessPageClient requestId={requestId}>
            <div className="bg-primary/5 rounded-2xl p-4 mb-6 text-left">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground text-sm">What happens next?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Most requests are reviewed within 1 hour (8am–10pm AEST). We'll email you as soon as your document
                    is ready or if the doctor needs more information.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {requestId && (
                <Button asChild className="w-full rounded-xl">
                  <Link href={`/patient/requests/${requestId}`}>
                    View my request
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild className="w-full rounded-xl bg-transparent">
                <Link href="/patient">Back to dashboard</Link>
              </Button>
            </div>
          </SuccessPageClient>
        </div>
      </main>
      <Footer />
    </>
  )
}
