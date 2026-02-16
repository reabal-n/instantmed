import { Loader } from "@/components/ui/loader"

export default function DoctorLoading() {
  return (
    <div 
      className="min-h-screen bg-linear-to-b from-background to-muted/30"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">Loading doctor dashboard</span>
      <div className="container max-w-6xl py-8 px-4">
        {/* Animated loader */}
        <div className="flex justify-center mb-8">
          <Loader size="md" />
        </div>
        {/* Header skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-64 bg-muted/60 rounded-lg mb-2" />
          <div className="h-4 w-48 bg-muted/40 rounded-lg" />
        </div>

        {/* Stats cards with stagger animation */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="glass-card rounded-2xl p-5 animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-24 bg-muted/60 rounded" />
                <div className="h-4 w-4 bg-muted/40 rounded" />
              </div>
              <div className="h-9 w-14 bg-muted/60 rounded" />
            </div>
          ))}
        </div>

        {/* Queue skeleton */}
        <div className="glass-card rounded-2xl overflow-hidden animate-pulse" style={{ animationDelay: '0.5s' }}>
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="h-6 w-40 bg-muted/60 rounded mb-2" />
                <div className="h-4 w-56 bg-muted/40 rounded" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-muted/40 rounded-lg" />
                <div className="h-8 w-20 bg-muted/40 rounded-lg" />
              </div>
            </div>
            {/* Tabs skeleton */}
            <div className="flex gap-2 mb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-24 bg-muted/40 rounded-lg" />
              ))}
            </div>
          </div>
          
          {/* Request rows */}
          <div className="px-6 pb-6">
            <div className="divide-y divide-white/10">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-4 py-5"
                  style={{ animationDelay: `${0.6 + i * 0.1}s` }}
                >
                  <div className="h-10 w-10 bg-muted/60 rounded-full" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-4 w-32 bg-muted/60 rounded" />
                      <div className="h-4 w-8 bg-muted/40 rounded" />
                      <div className="h-5 w-16 bg-indigo-100/50 rounded-full" />
                    </div>
                    <div className="h-3 w-24 bg-muted/40 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-muted/40 rounded-xl" />
                    <div className="h-8 w-8 bg-indigo-100/50 rounded-xl" />
                    <div className="h-8 w-8 bg-muted/40 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
