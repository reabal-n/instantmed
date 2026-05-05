import { requireRole } from "@/lib/auth/helpers"

import { ParchmentConformanceClient } from "./parchment-conformance-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Parchment Conformance | Admin",
  description: "Sandbox Parchment conformance recording helper.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ParchmentConformancePage() {
  await requireRole(["admin"], { redirectTo: "/" })

  return <ParchmentConformanceClient seed={Date.now().toString(36)} />
}
