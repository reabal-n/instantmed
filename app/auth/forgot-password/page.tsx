import { ForgotPasswordClient } from "./forgot-password-client"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />
}
