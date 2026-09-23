"use client"

import { ArrowRight, CheckCircle2, Mail, Phone } from "lucide-react"
import Link from "next/link"
import { type FormEvent, useEffect, useRef, useState } from "react"

import { submitContactForm } from "@/app/actions/contact-form"
import { InformationalPageShell } from "@/components/marketing/shared/informational-page-shell"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { capture } from "@/lib/analytics/capture"
import { buildSignInRedirectHref } from "@/lib/auth/redirects"
import { CONTACT_EMAIL, CONTACT_EMAIL_COMPLAINTS, CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"

const CONTACT_CONFIG = { analyticsId: "contact", sticky: false as const }
const reasons = [
  { id: "general", label: "General enquiry" },
  { id: "request", label: "My request" },
  { id: "support", label: "Technical help" },
  { id: "complaint", label: "Feedback" },
]

export function ContactClient() {
  const [reason, setReason] = useState("general")
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false)
  const successRef = useRef<HTMLHeadingElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sent) successRef.current?.focus()
    else if (error) errorRef.current?.focus()
  }, [sent, error])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setError(null)
    const formData = new FormData(event.currentTarget)
    formData.set("reason", reason)
    // Keep the existing event's meaning: an attempt, not confirmed delivery.
    capture("contact_form_submitted", { contact_reason: reason })
    try {
      const result = await submitContactForm(formData)
      if (result.success) {
        setSent(true)
        capture("contact_form_succeeded", { contact_reason: reason })
      } else {
        setError(result.error || "We couldn't send your message. Please try again or email us.")
        capture("contact_form_error", { category: "submission_failed" })
      }
    } catch {
      setError("We couldn't send your message. Your text is still here. Try again or email us.")
      capture("contact_form_error", { category: "connection_failed" })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <InformationalPageShell config={CONTACT_CONFIG}>
      {() => (
        <section className="mx-auto max-w-5xl px-4 pt-28 pb-16 sm:px-6 sm:pt-36 sm:pb-24">
          <Heading level="h1">Contact support</Heading>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">Need help with a request, payment or using InstantMed? Get in touch below.</p>
          <div className="mt-8 grid gap-8 lg:mt-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
            <div>
              <address className="space-y-3 not-italic">
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex min-h-12 items-center gap-3 text-primary underline-offset-4 hover:underline">
                  <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />{CONTACT_EMAIL}
                </a>
                <a href={`tel:${CONTACT_PHONE_TEL}`} className="flex min-h-12 items-center gap-3 text-primary underline-offset-4 hover:underline">
                  <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{CONTACT_PHONE}<span className="block text-sm text-muted-foreground">24/7 voice message support</span></span>
                </a>
              </address>
              <div className="mt-6 border-t border-border/60 pt-5">
                <h2 className="font-semibold">Already submitted a request?</h2>
                <Link href={buildSignInRedirectHref("/patient/intakes")} className="inline-flex min-h-12 items-center gap-2 text-primary hover:underline">Sign in to view my requests<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <p className="text-sm leading-relaxed text-muted-foreground">Checked out as a guest? Use the tracking link in your confirmation email. You can contact us if you can&apos;t find it.</p>
              </div>
              <div className="mt-6 hidden space-y-4 lg:block">
                <Link href="/faq" className="inline-flex min-h-12 items-center gap-2 text-primary hover:underline">Frequently asked questions<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <Complaints />
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-md shadow-primary/[0.06] dark:bg-card sm:p-8">
              {sent ? (
                <div role="status" className="py-8">
                  <CheckCircle2 className="mb-4 h-8 w-8 text-success" aria-hidden="true" />
                  <h2 ref={successRef} tabIndex={-1} className="text-2xl font-semibold outline-none">Message sent</h2>
                  <p className="mt-3 text-muted-foreground">We&apos;ll reply to the email address you provided.</p>
                  <Button variant="outline" className="mt-6 min-h-12" onClick={() => setSent(false)}>Send another message</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} aria-label="Contact support" aria-busy={pending} className="space-y-5">
                  <h2 className="text-xl font-semibold">Send a message</h2>
                  <fieldset disabled={pending} className="space-y-5">
                    <div className="space-y-2">
                      <Label id="contact-reason-label">What can we help with?</Label>
                      <RadioGroup value={reason} onValueChange={setReason} aria-labelledby="contact-reason-label" className="grid grid-cols-2 gap-2">
                        {reasons.map(item => <RadioGroupItem key={item.id} id={`reason-${item.id}`} value={item.id} className="min-h-12 max-w-none! rounded-lg border border-border/60 px-3 py-2 font-normal [&>button]:size-4! [&>button]:min-h-4! [&>button]:min-w-4! [&>button]:shrink-0">{item.label}</RadioGroupItem>)}
                      </RadioGroup>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" name="name" required maxLength={100} autoComplete="name" className="min-h-12" /></div>
                      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" className="min-h-12" /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" required minLength={10} maxLength={5000} minRows={5} aria-describedby="message-help" /><p id="message-help" className="text-sm text-muted-foreground">Please don&apos;t include medical details or identity documents here. Use your secure request for those.</p></div>
                  </fieldset>
                  {error && <div id="contact-error" ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive outline-none">{error}</div>}
                  <Button type="submit" disabled={pending} aria-describedby={error ? "contact-error" : undefined} className="min-h-12 w-full rounded-lg text-base">{pending ? "Sending…" : "Send message"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
                </form>
              )}
            </div>
            <div className="lg:hidden"><Link href="/faq" className="inline-flex min-h-12 text-primary hover:underline">Frequently asked questions</Link><Complaints /></div>
          </div>
        </section>
      )}
    </InformationalPageShell>
  )
}

function Complaints() {
  return <div className="text-sm leading-relaxed"><Link href="/complaints" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">Make a complaint</Link><a href={`mailto:${CONTACT_EMAIL_COMPLAINTS}`} className="flex min-h-11 items-center break-all text-muted-foreground hover:text-primary">{CONTACT_EMAIL_COMPLAINTS}</a><p className="text-muted-foreground">{getApprovedClaim("complaints_timing")}</p></div>
}
