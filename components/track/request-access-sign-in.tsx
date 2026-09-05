"use client"

import Link from "next/link"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { fetchWithCsrf } from "@/lib/security/csrf-client"

export function RequestAccessSignIn() {
  const sending = useRef(false)
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")

  async function requestLink() {
    if (sending.current || state === "sent") return
    sending.current = true
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
        Choose an email link to create or connect your secure account. No password or repeated details.
      </p>
      <Button className="min-h-12 w-full whitespace-normal rounded-xl px-3 text-base" size="lg"
        disabled={state === "sending" || state === "sent"} onClick={requestLink}>
        {state === "sending" ? "Requesting link…" : state === "sent" ? "Link requested" : "Email me a secure access link"}
      </Button>
      {state === "sent" && (
        <p role="status" className="text-base leading-relaxed text-muted-foreground">
          Check the inbox used for your request. If access is available, a secure link will arrive shortly. Check junk mail too.
        </p>
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
