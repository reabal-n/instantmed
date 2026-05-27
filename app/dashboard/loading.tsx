import { Clock3 } from "lucide-react"

function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`rounded-md bg-[#F1EFEA] motion-safe:animate-pulse dark:bg-white/10 ${className}`}
      aria-hidden
    />
  )
}

/**
 * Loading state for `/dashboard`, the canonical staff cockpit.
 *
 * This mirrors the real operator layout rather than showing a generic stat
 * grid, so staff see the shell, status strip, queue row, and detail rail
 * immediately while server data resolves.
 */
export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-3 overflow-hidden" aria-busy="true">
      <header className="flex shrink-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Pulse className="h-6 w-28" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-white px-3 text-sm font-semibold text-foreground shadow-sm shadow-primary/[0.03] dark:bg-card">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden />
            <Pulse className="h-4 w-32" />
            <Pulse className="hidden h-3 w-20 sm:block" />
          </div>
          <Pulse className="h-10 w-28 rounded-xl" />
          <Pulse className="h-10 w-24 rounded-xl" />
        </div>
      </header>

      <div className="rounded-lg border border-warning-border bg-warning-light px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
          <Pulse className="h-3.5 w-72 max-w-full bg-warning/15" />
        </div>
      </div>

      <section className="min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="shrink-0 rounded-xl border border-border/50 bg-card px-3 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Pulse className="h-5 w-28" />
              <Pulse className="h-9 w-64 rounded-lg" />
            </div>
            <div className="mt-3 flex gap-1.5 overflow-hidden rounded-lg bg-muted/25 p-1 sm:w-fit">
              {["w-14", "w-20", "w-16", "w-28"].map((width) => (
                <Pulse key={width} className={`h-7 ${width} rounded-md bg-white dark:bg-white/10`} />
              ))}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.4fr)]">
            <div className="min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Pulse className="h-9 w-9 rounded-full" />
                  <div className="min-w-0 space-y-2">
                    <Pulse className="h-4 w-36" />
                    <Pulse className="h-3 w-48" />
                  </div>
                </div>
                <Pulse className="h-8 w-20 rounded-lg" />
                <div className="col-span-2 mt-1 flex gap-1.5">
                  <Pulse className="h-6 w-16 rounded-md" />
                  <Pulse className="h-6 w-14 rounded-md" />
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04]">
              <div className="border-b border-border/45 px-5 py-4">
                <Pulse className="h-4 w-28" />
                <Pulse className="mt-2 h-3 w-40" />
              </div>
              <div className="px-5 py-4">
                <Pulse className="h-3 w-16" />
                <Pulse className="mt-2 h-8 w-12" />
                <Pulse className="mt-2 h-3 w-48" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
