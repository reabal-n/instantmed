import { LoaderWithText } from "@/components/ui/loader"

export default function Loading() {
  return (
    <main className="min-h-screen bg-hero flex items-center justify-center px-4">
      <LoaderWithText text="Loading..." size="lg" />
    </main>
  )
}
