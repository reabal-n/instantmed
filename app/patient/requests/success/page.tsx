import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { SuccessCelebration } from "@/components/ui/success-celebration"

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
          <SuccessCelebration type="request" requestId={requestId} showConfetti />
        </div>
      </main>
      <Footer />
    </>
  )
}
