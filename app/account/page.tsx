import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const { userId } = await auth()
  
  // Redirect to consolidated patient settings
  // Unauthenticated users go to sign-in, authenticated users go to settings
  if (!userId) {
    redirect("/sign-in?redirect=/patient/settings")
  }
  
  redirect("/patient/settings")
}
