import { ForgotPasswordClient } from "./forgot-password-client"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />
}
