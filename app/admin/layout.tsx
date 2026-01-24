import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "InstantMed admin dashboard.",
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require admin role for all admin routes
  const authUser = await getAuthenticatedUserWithProfile()
  if (!authUser) {
    redirect("/sign-in")
  }
  
  if (authUser.profile.role !== "admin") {
    redirect("/")
  }
  
  return children
}
