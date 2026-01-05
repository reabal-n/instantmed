import { ResetPasswordClient } from "./reset-password-client"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  return <ResetPasswordClient />
}
