import { Loader2, ShieldCheck } from "lucide-react"

export default function PostSignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6" aria-busy="true" aria-live="polite">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-6 text-center shadow-md shadow-primary/[0.06]">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <p className="text-base font-semibold text-foreground" role="status">
          Finishing secure sign-in
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Checking your account and sending you to the right place.
        </p>
      </div>
    </div>
  )
}
