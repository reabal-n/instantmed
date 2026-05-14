import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth/helpers"
import { PATIENT_SETTINGS_HREF } from "@/lib/dashboard/routes"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const { userId } = await auth()
  
  // Redirect to consolidated patient settings
  // Unauthenticated users go to sign-in, authenticated users go to settings
  if (!userId) {
    redirect(`/sign-in?redirect=${encodeURIComponent(PATIENT_SETTINGS_HREF)}`)
  }
  
  redirect(PATIENT_SETTINGS_HREF)
}
