import type { Metadata } from "next"
import { requireRole } from "@/lib/auth"

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
  await requireRole(["admin"], { redirectTo: "/" })
  
  return children
}
