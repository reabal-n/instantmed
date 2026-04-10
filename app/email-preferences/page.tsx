import type { Metadata } from "next"
import Image from "next/image"
import { verifyUnsubscribeToken } from "@/lib/crypto/unsubscribe-token"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { PreferencesForm } from "./preferences-form"

export const metadata: Metadata = {
  title: "Email Preferences - InstantMed",
  robots: { index: false, follow: false },
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return "***@***.com"
  const maskedLocal =
    local.length <= 2
      ? local[0] + "***"
      : local.slice(0, 2) + "***"
  const domainParts = domain.split(".")
  const maskedDomain =
    domainParts[0] && domainParts[0].length > 3
      ? domainParts[0].slice(0, 3) + "***"
      : (domainParts[0]?.[0] ?? "") + "***"
  const tld = domainParts.slice(1).join(".")
  return `${maskedLocal}@${maskedDomain}.${tld}`
}

interface EmailPreferencesData {
  marketing_emails: boolean
  abandoned_checkout_emails: boolean
  transactional_emails: boolean
}

export default async function EmailPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : null

  if (!token) {
    return <ErrorLayout message="Missing token. Please use the link from your email." />
  }

  const result = verifyUnsubscribeToken(token)
  if (!result) {
    return (
      <ErrorLayout message="This link is invalid or has expired. Please check your most recent email for an updated link." />
    )
  }

  const { profileId } = result
  const supabase = createServiceRoleClient()

  // Load profile email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", profileId)
    .single()

  if (!profile) {
    return <ErrorLayout message="Account not found. Please contact support@instantmed.com.au for help." />
  }

  // Load or create email preferences
  const { data: existingPrefs } = await supabase
    .from("email_preferences")
    .select("marketing_emails, abandoned_checkout_emails, transactional_emails")
    .eq("profile_id", profileId)
    .maybeSingle()

  const preferences: EmailPreferencesData = existingPrefs ?? {
    marketing_emails: true,
    abandoned_checkout_emails: true,
    transactional_emails: true,
  }

  const maskedEmail = maskEmail(profile.email)

  return (
    <PageLayout>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Email Preferences
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage notifications for{" "}
          <span className="font-medium text-gray-700">{maskedEmail}</span>
        </p>
      </div>

      <PreferencesForm token={token} initialPreferences={preferences} />

      <div className="mt-6 border-t border-gray-100 pt-4 text-center">
        <p className="text-xs text-gray-400">
          InstantMed Pty Ltd &middot; ABN 64 694 559 334
          <br />
          Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010
        </p>
      </div>
    </PageLayout>
  )
}

function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#F8F7F4",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image
            src="/branding/logo.png"
            alt="InstantMed"
            width={140}
            height={36}
            priority
          />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}

function ErrorLayout({ message }: { message: string }) {
  return (
    <PageLayout>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-6 w-6 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">
          Unable to load preferences
        </h1>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <a
          href="https://instantmed.com.au"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          Go to InstantMed
        </a>
      </div>
    </PageLayout>
  )
}
