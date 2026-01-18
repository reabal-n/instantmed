import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { VerifyEmailClient } from "./verify-email-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Verify Email | InstantMed",
  description: "Verify your email address to access your documents.",
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    token_hash?: string
    type?: string
    redirect?: string
    error?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  // Check if user is already verified
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user?.email_confirmed_at) {
    // Already verified - redirect to intended destination or dashboard
    const redirectTo = params.redirect || "/patient"
    redirect(redirectTo)
  }
  
  // Handle Supabase email verification callback
  if (params.token_hash && params.type === "email") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: "email",
    })
    
    if (!error) {
      // Verification successful - redirect
      const redirectTo = params.redirect || "/patient"
      redirect(redirectTo)
    }
    
    // Pass error to client for display
    return (
      <VerifyEmailClient 
        email={user?.email} 
        error="Verification link expired or invalid. Please request a new one."
        isVerified={false}
      />
    )
  }
  
  // Show verification pending state
  return (
    <VerifyEmailClient 
      email={user?.email}
      error={params.error}
      isVerified={!!user?.email_confirmed_at}
    />
  )
}
