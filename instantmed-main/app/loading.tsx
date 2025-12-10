export default function Loading() {
  return (
    <main className="min-h-screen bg-hero flex items-center justify-center px-4">
      <div className="text-center">
        {/* Animated Logo/Spinner */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00E2B5] to-[#00C9A0] animate-pulse" />
          <div className="absolute inset-0 w-16 h-16 rounded-2xl border-2 border-[#00E2B5]/30 animate-ping" />
        </div>

        <p className="text-muted-foreground text-sm animate-pulse">Loading...</p>
      </div>
    </main>
  )
}
