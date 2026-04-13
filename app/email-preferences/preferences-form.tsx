"use client"

import { useState, useTransition } from "react"

import { updateEmailPreferencesWithToken } from "@/app/actions/update-email-preferences"

interface Preferences {
  marketing_emails: boolean
  abandoned_checkout_emails: boolean
  transactional_emails: boolean
}

interface PreferencesFormProps {
  token: string
  initialPreferences: Preferences
}

const PREFERENCE_CONFIG = [
  {
    key: "marketing_emails" as const,
    label: "Marketing emails",
    description: "Product updates, new services, and health tips",
  },
  {
    key: "abandoned_checkout_emails" as const,
    label: "Checkout reminders",
    description: "Reminders about incomplete requests",
  },
  {
    key: "transactional_emails" as const,
    label: "Transactional emails",
    description:
      "Request confirmations, approvals, and certificate delivery",
    locked: true,
    lockedReason: "Required for your care",
  },
] as const

export function PreferencesForm({
  token,
  initialPreferences,
}: PreferencesFormProps) {
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error"
    message?: string
  }>({ type: "idle" })

  function handleToggle(key: keyof Omit<Preferences, "transactional_emails">) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }))
    setStatus({ type: "idle" })
  }

  function handleSave() {
    setStatus({ type: "idle" })
    startTransition(async () => {
      const result = await updateEmailPreferencesWithToken(token, {
        marketing_emails: preferences.marketing_emails,
        abandoned_checkout_emails: preferences.abandoned_checkout_emails,
      })

      if (result.success) {
        setStatus({ type: "success", message: "Preferences saved" })
      } else {
        setStatus({
          type: "error",
          message: result.error ?? "Failed to save. Please try again.",
        })
      }
    })
  }

  function handleUnsubscribeAll() {
    setPreferences({
      marketing_emails: false,
      abandoned_checkout_emails: false,
      transactional_emails: true,
    })
    setStatus({ type: "idle" })
    startTransition(async () => {
      const result = await updateEmailPreferencesWithToken(token, {
        marketing_emails: false,
        abandoned_checkout_emails: false,
      })

      if (result.success) {
        setPreferences({
          marketing_emails: false,
          abandoned_checkout_emails: false,
          transactional_emails: true,
        })
        setStatus({
          type: "success",
          message: "You have been unsubscribed from all optional emails",
        })
      } else {
        setStatus({
          type: "error",
          message: result.error ?? "Failed to save. Please try again.",
        })
      }
    })
  }

  const hasChanges =
    preferences.marketing_emails !== initialPreferences.marketing_emails ||
    preferences.abandoned_checkout_emails !==
      initialPreferences.abandoned_checkout_emails

  return (
    <div>
      <div className="space-y-1">
        {PREFERENCE_CONFIG.map((pref) => {
          const isOn = preferences[pref.key]
          const isLocked = "locked" in pref && pref.locked

          return (
            <div
              key={pref.key}
              className="flex items-center justify-between rounded-lg px-3 py-3"
            >
              <div className="mr-4 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {pref.label}
                </p>
                <p className="text-xs text-gray-500">{pref.description}</p>
                {isLocked && "lockedReason" in pref && (
                  <p className="mt-0.5 text-xs font-medium text-blue-600">
                    {pref.lockedReason}
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={`Toggle ${pref.label}`}
                disabled={isLocked || isPending}
                onClick={() => {
                  if (!isLocked) {
                    handleToggle(
                      pref.key as keyof Omit<Preferences, "transactional_emails">
                    )
                  }
                }}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
                  transition-colors duration-200 ease-in-out focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                  ${isLocked ? "cursor-not-allowed opacity-50" : ""}
                  ${isOn ? "bg-blue-600" : "bg-gray-200"}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm
                    ring-0 transition-transform duration-200 ease-in-out
                    ${isOn ? "translate-x-6" : "translate-x-1"}
                  `}
                />
              </button>
            </div>
          )
        })}
      </div>

      {/* Status message */}
      {status.type !== "idle" && (
        <div
          className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            status.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {status.message}
        </div>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || (!hasChanges && status.type !== "error")}
        className={`
          mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          focus-visible:ring-offset-2
          ${
            isPending || (!hasChanges && status.type !== "error")
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          }
        `}
      >
        {isPending ? "Saving..." : "Save preferences"}
      </button>

      {/* Unsubscribe all */}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={handleUnsubscribeAll}
          disabled={isPending}
          className="text-xs text-gray-400 underline decoration-gray-300 hover:text-gray-600 disabled:cursor-not-allowed"
        >
          Unsubscribe from all optional emails
        </button>
      </div>
    </div>
  )
}
