import { PremiumLoader } from "@/components/ui/loader"

export default function Loading() {
  return (
    <main 
      className="min-h-screen bg-hero flex items-center justify-center px-4"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">Loading page content</span>
      <PremiumLoader text="Loading" />
    </main>
  )
}
