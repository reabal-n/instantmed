import { redirect } from "next/navigation"
import { isTestMode } from "@/lib/test-mode"
import { BootstrapClient } from "./bootstrap-client"

export default function BootstrapPage() {
  // Security: Only accessible in test mode
  if (!isTestMode) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <BootstrapClient />
    </div>
  )
}
