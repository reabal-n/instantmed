"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { submitContactForm } from "@/app/actions/contact-form"
import { capture } from "@/lib/analytics/capture"
import { CONTACT_EMAIL_HELLO } from "@/lib/constants"

interface BusinessLeadFormProps {
  /** Anchor id so external links can deep-link to the form. */
  id?: string
}

const teamSizes = [
  { value: "1-25", label: "1-25 people" },
  { value: "26-100", label: "26-100 people" },
  { value: "101-500", label: "101-500 people" },
  { value: "500+", label: "500+ people" },
] as const

export function BusinessLeadForm({ id = "contact" }: BusinessLeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [teamSize, setTeamSize] = useState<string>(teamSizes[0].value)
  const prefersReducedMotion = useReducedMotion()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const company = String(fd.get("company") ?? "").trim()
    const name = String(fd.get("name") ?? "").trim()
    const email = String(fd.get("email") ?? "").trim()
    const phone = String(fd.get("phone") ?? "").trim()
    const monthlyVolume = String(fd.get("monthlyVolume") ?? "").trim()
    const notes = String(fd.get("notes") ?? "").trim()

    // Fold B2B-specific fields into the contact-form action's single
    // `message` field so we don't have to extend its schema or DB. The
    // support inbox sees one tagged email with everything inline.
    const message = [
      `Company: ${company || "(not provided)"}`,
      `Team size: ${teamSize}`,
      monthlyVolume ? `Expected monthly volume: ${monthlyVolume}` : null,
      phone ? `Phone: ${phone}` : null,
      "",
      "Notes:",
      notes || "(none)",
    ]
      .filter((line) => line !== null)
      .join("\n")

    const subject = `B2B inquiry · ${company || name}`

    const payload = new FormData()
    payload.set("name", name)
    payload.set("email", email)
    payload.set("subject", subject)
    payload.set("message", message)
    payload.set("reason", "B2B / Corporate")

    capture("business_lead_submitted", {
      team_size: teamSize,
      has_phone: phone.length > 0,
      has_volume_estimate: monthlyVolume.length > 0,
    })

    try {
      const result = await submitContactForm(payload)
      setIsSubmitting(false)

      if (result.success) {
        setIsSubmitted(true)
        return
      }

      setSubmitError(result.error ?? "We couldn't send that. Try again or email us directly.")
      capture("business_lead_error", { error: result.error })
    } catch (err) {
      setIsSubmitting(false)
      setSubmitError("We couldn't send that. Try again or email us directly.")
      capture("business_lead_error", { error: String(err) })
    }
  }

  if (isSubmitted) {
    return (
      <div
        id={id}
        className="rounded-2xl border border-border/50 bg-white p-8 shadow-md shadow-primary/[0.06] dark:bg-card sm:p-10"
      >
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center"
        >
          <div
            className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-success-light text-success"
            role="img"
            aria-label="Success"
          >
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Thanks, we've got it.</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            One of the founders will reply within one business day with next steps, contract terms,
            and a co-branded URL to test internally.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            In the meantime, you can email us directly at{" "}
            <Link
              href={`mailto:${CONTACT_EMAIL_HELLO}`}
              className="font-medium text-primary hover:text-primary/80"
            >
              {CONTACT_EMAIL_HELLO}
            </Link>
            .
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border/50 bg-white p-6 shadow-md shadow-primary/[0.06] dark:bg-card sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Company</span>
          <input
            required
            type="text"
            name="company"
            placeholder="Your company"
            autoComplete="organization"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Your name</span>
          <input
            required
            type="text"
            name="name"
            placeholder="First and last"
            autoComplete="name"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Work email</span>
          <input
            required
            type="email"
            name="email"
            placeholder="you@company.com.au"
            autoComplete="email"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">
            Phone <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </span>
          <input
            type="tel"
            name="phone"
            placeholder="04XX XXX XXX"
            autoComplete="tel"
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-foreground">Team size</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {teamSizes.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                teamSize === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="teamSize"
                value={option.value}
                checked={teamSize === option.value}
                onChange={() => setTeamSize(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">
          Expected monthly volume{" "}
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </span>
        <input
          type="text"
          name="monthlyVolume"
          placeholder="e.g. ~30 certs/month"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <label className="mt-5 flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">Anything else we should know?</span>
        <textarea
          name="notes"
          rows={4}
          placeholder="HR policy, industries you cover, security requirements, etc."
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>

      {submitError ? (
        <p
          role="alert"
          aria-live="polite"
          className="mt-4 rounded-lg border border-destructive-border bg-destructive-light px-3 py-2 text-sm text-destructive"
        >
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <>
            Talk to us
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        We reply within one business day. No autoresponder loop, no sales sequence.
      </p>
    </form>
  )
}
