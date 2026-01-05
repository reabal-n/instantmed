import { redirect } from "next/navigation"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export default function LoginRedirect() {
  redirect("/sign-in")
}
