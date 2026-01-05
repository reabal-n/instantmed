import { LoginClient } from "./login-client"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function LoginPage() {
  return <LoginClient />
}
