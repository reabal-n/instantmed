import { Stethoscope } from "lucide-react"

export default function Loading() {
  return (
    <main className="min-h-screen bg-hero flex items-center justify-center px-4" role="status" aria-label="Loading">
      <div className="text-center">
        {/* Premium animated loader */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-[#00E2B5] border-r-[#06B6D4] animate-spin" />

          {/* Inner glow container */}
          <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-[#00E2B5]/20 to-[#06B6D4]/20 backdrop-blur-sm" />

          {/* Pulsing background */}
          <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-[#00E2B5] to-[#06B6D4] opacity-20 animate-pulse" />

          {/* Icon container */}
          <div className="absolute inset-2 rounded-xl bg-background/80 flex items-center justify-center shadow-inner">
            <Stethoscope className="w-10 h-10 text-[#00E2B5] animate-pulse" />
          </div>

          {/* Decorative dots */}
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#00E2B5] animate-ping" />
          <div
            className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-[#06B6D4] animate-ping"
            style={{ animationDelay: "0.5s" }}
          />
        </div>

        {/* Loading text with dots */}
        <div className="flex items-center justify-center gap-1">
          <span className="text-muted-foreground text-sm font-medium">Loading</span>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E2B5] animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#00E2B5] animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#00E2B5] animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </span>
        </div>

        {/* Subtle shimmer bar */}
        <div className="mt-6 w-48 h-1 bg-muted rounded-full overflow-hidden mx-auto">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#00E2B5]/50 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </main>
  )
}
