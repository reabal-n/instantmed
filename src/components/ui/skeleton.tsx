import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-100",
        className
      )}
      {...props}
    />
  )
}

// Premium skeleton with shimmer effect
function SkeletonShimmer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-100",
        "after:absolute after:inset-0 after:-translate-x-full",
        "after:animate-[shimmer_2s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent",
        className
      )}
      {...props}
    />
  )
}

// Card skeleton for dashboard
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-center gap-4">
        <SkeletonShimmer className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonShimmer className="h-4 w-3/4" />
          <SkeletonShimmer className="h-3 w-1/2" />
        </div>
        <SkeletonShimmer className="h-8 w-20 rounded-full" />
      </div>
    </div>
  )
}

// Request item skeleton
function SkeletonRequestItem() {
  return (
    <div className="flex items-center gap-4 py-4">
      <SkeletonShimmer className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonShimmer className="h-4 w-40" />
        <SkeletonShimmer className="h-3 w-24" />
      </div>
      <SkeletonShimmer className="h-6 w-24 rounded-full" />
    </div>
  )
}

// Form field skeleton
function SkeletonFormField() {
  return (
    <div className="space-y-2">
      <SkeletonShimmer className="h-4 w-24" />
      <SkeletonShimmer className="h-11 w-full rounded-xl" />
    </div>
  )
}

// Service card skeleton
function SkeletonServiceCard() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-start gap-4">
        <SkeletonShimmer className="h-14 w-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex justify-between">
            <SkeletonShimmer className="h-5 w-40" />
            <SkeletonShimmer className="h-5 w-16" />
          </div>
          <SkeletonShimmer className="h-4 w-full" />
          <SkeletonShimmer className="h-4 w-2/3" />
          <div className="space-y-2 pt-2">
            <SkeletonShimmer className="h-3 w-48" />
            <SkeletonShimmer className="h-3 w-40" />
            <SkeletonShimmer className="h-3 w-36" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Testimonial skeleton
function SkeletonTestimonial() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <SkeletonShimmer key={i} className="h-4 w-4 rounded" />
        ))}
      </div>
      <div className="space-y-2 mb-6">
        <SkeletonShimmer className="h-5 w-full" />
        <SkeletonShimmer className="h-5 w-full" />
        <SkeletonShimmer className="h-5 w-2/3" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonShimmer className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <SkeletonShimmer className="h-4 w-24" />
          <SkeletonShimmer className="h-3 w-32" />
        </div>
      </div>
    </div>
  )
}

// Page loading skeleton
function SkeletonPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkeletonShimmer className="h-8 w-8 rounded-lg" />
            <SkeletonShimmer className="h-5 w-24" />
          </div>
          <SkeletonShimmer className="h-9 w-24 rounded-md" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <SkeletonShimmer className="h-8 w-64 mx-auto" />
            <SkeletonShimmer className="h-4 w-48 mx-auto" />
          </div>
          
          <div className="space-y-4">
            <SkeletonServiceCard />
            <SkeletonServiceCard />
          </div>
          
          <SkeletonShimmer className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export { 
  Skeleton, 
  SkeletonShimmer, 
  SkeletonCard, 
  SkeletonRequestItem, 
  SkeletonFormField,
  SkeletonServiceCard,
  SkeletonTestimonial,
  SkeletonPage
}
