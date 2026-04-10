import { Skeleton } from "@/components/ui/skeleton"

export default function PrescriptionSubtypeLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading prescription page</span>
      <Skeleton className="h-8 w-48" />
    </div>
  )
}
