import { Suspense } from "react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { CompleteAccountForm } from "./complete-account-form"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Complete Your Account",
  description: "Create your account to access your medical certificate",
}

export default async function CompleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string; intake_id?: string; email?: string; session_id?: string }>
}) {
  const params = await searchParams
  // Support both intake_id (guest checkout) and request_id (legacy) 
  const intakeId = params.intake_id || params.request_id
  
  // Fetch email from intake server-side (more secure than URL param)
  let email = params.email // Fallback to URL param for backwards compatibility
  if (intakeId && !email) {
    try {
      const supabase = createServiceRoleClient()
      const { data: intake } = await supabase
        .from("intakes")
        .select("patient:profiles!patient_id(email)")
        .eq("id", intakeId)
        .single()
      
      const patient = intake?.patient as { email?: string } | null
      email = patient?.email || undefined
    } catch {
      // Silently fail - email display is optional
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-linear-to-b from-background to-muted/30 pt-32 pb-20">
        <div className="container max-w-md mx-auto px-4">
          <Suspense fallback={<div>Loading...</div>}>
            <CompleteAccountForm intakeId={intakeId} email={email} sessionId={params.session_id} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
