import { Metadata } from "next"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { VerifyClient } from "./verify-client"

export const metadata: Metadata = {
  title: "Verify Document | InstantMed",
  description: "Verify the authenticity of medical certificates and documents issued by InstantMed.",
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <VerifyClient />
      </main>
      <Footer />
    </div>
  )
}
