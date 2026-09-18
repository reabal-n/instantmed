"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { fetchWithCsrf } from "@/lib/security/csrf-client"

export function RequestAccessSignIn() {
  const sending = useRef(false)
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [canRequestAgain, setCanRequestAgain] = useState(false)

  useEffect(() => {
    if (state !== "sent") return
    // Allow recovery without immediately replacing a link still in transit.
    // Server rate limits and mailbox eligibility remain authoritative.
    const timer = window.setTimeout(() => setCanRequestAgain(true), 60_000)
    return () => window.clearTimeout(timer)
  }, [state])

  async function requestLink() {
    if (sending.current || (state === "sent" && !canRequestAgain)) return
    sending.current = true
    setCanRequestAgain(false)
    setState("sending")
    try {
      const response = await fetchWithCsrf("/track/request/access-link", { method: "POST" })
      if (!response.ok) throw new Error("Request unavailable")
      setState("sent")
    } catch {
      setState("error")
    } finally {
      sending.current = false
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <p className="text-base leading-relaxed text-muted-foreground">
        We’ll request a separate sign-in email so you can open your documents securely. No password or repeated details.
      </p>
      <Button className="min-h-12 w-full whitespace-normal rounded-xl px-3 text-base" size="lg"
        disabled={state === "sending" || (state === "sent" && !canRequestAgain)} onClick={requestLink}>
        {state === "sending" ? "Requesting link…" : state === "sent" ? canRequestAgain ? "Request another link" : "Link requested" : "Email me a secure access link"}
      </Button>
      {state === "sent" && (
        <div className="space-y-3">
          <p role="status" className="text-base leading-relaxed text-muted-foreground">
            Check the inbox used for your request. If access is available, open the new sign-in or confirmation email and confirm to continue. The request-update email brings you back here. Check junk mail too.
          </p>
          <Button asChild className="min-h-12 w-full whitespace-normal rounded-xl px-3 text-base" size="lg" variant="outline">
            {/* A full request rechecks server-side ownership after sign-in in
                another tab, without resending email or trusting client state. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Recheck server auth with a fresh document, not the cached route. */}
            <a href="/track/request">I’ve signed in. Open my request</a>
          </Button>
          {!canRequestAgain && (
            <p className="text-base leading-relaxed text-muted-foreground">
              You can request another link after one minute. Use the newest email if you request another.
            </p>
          )}
        </div>
      )}
      {state === "error" && (
        <p role="alert" className="text-base text-destructive">
          We couldn’t connect. Please try again, or use sign in below.
        </p>
      )}
      <Link className="flex min-h-12 items-center justify-center text-base font-medium text-primary underline underline-offset-4"
        href="/sign-in?redirect=%2Ftrack%2Frequest">Use sign in instead</Link>
    </div>
  )
}
