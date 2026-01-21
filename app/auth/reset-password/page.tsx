import { ResetPasswordClient } from "./reset-password-client"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  return <ResetPasswordClient />
}
