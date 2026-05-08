import Link from "next/link"

export const dynamic = "force-dynamic"

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4" role="main">
      <div className="max-w-md text-center">
        <p
          className="mb-6 select-none text-6xl font-semibold tabular-nums tracking-normal text-muted-foreground/25 sm:text-7xl"
          aria-label="Error 404"
        >
          404
        </p>

        <h1 className="mb-3 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
          Page not found
        </h1>
        <p className="mb-8 leading-relaxed text-muted-foreground">
          The page you are looking for is not available.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            prefetch={false}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Back to home
          </Link>
          <Link
            href="/request"
            prefetch={false}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            Start a request
          </Link>
        </div>
      </div>
    </main>
  )
}
