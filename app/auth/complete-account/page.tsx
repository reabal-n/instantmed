import { Suspense } from "react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { CompleteAccountForm } from "./complete-account-form"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Complete Your Account | InstantMed",
  description: "Create your account to access your medical certificate",
}

export default async function CompleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string; email?: string; session_id?: string }>
}) {
  const params = await searchParams

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-linear-to-b from-background to-muted/30 pt-32 pb-20">
        <div className="container max-w-md mx-auto px-4">
          <Suspense fallback={<div>Loading...</div>}>
            <CompleteAccountForm requestId={params.request_id} email={params.email} sessionId={params.session_id} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
