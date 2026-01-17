import { redirect } from "next/navigation"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export default function LoginRedirect() {
  redirect("/auth/login")
}
