import { Skeleton } from "@/components/ui/skeleton"

export default function PostSignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Signing you in</span>
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-8 rounded-full mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  )
}
