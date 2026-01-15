import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your InstantMed account settings and preferences.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
