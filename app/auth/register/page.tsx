import { RegisterClient } from "./register-client"

// Prevent static generation to avoid Clerk publishableKey build errors
export const dynamic = "force-dynamic"

export default function RegisterPage() {
  return <RegisterClient />
}
