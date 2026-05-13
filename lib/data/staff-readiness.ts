import "server-only"

import * as Sentry from "@sentry/nextjs"

import { type DoctorOnboardingState, getDoctorOnboardingState } from "@/lib/doctor/onboarding-state"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const DEFAULT_OWNER_ADMIN_EMAIL = "me@reabal.ai"
const SYSTEM_ADMIN_EMAILS = new Set(["system@instantmed.com.au"])

const STAFF_SELECT = [
  "id",
  "auth_user_id",
  "email",
  "full_name",
  "role",
  "provider_number",
  "ahpra_number",
  "signature_storage_path",
  "parchment_user_id",
  "doctor_available",
  "can_review_med_certs",
  "can_review_repeat_rx",
  "can_review_consults",
  "can_review_ed",
  "can_review_hair_loss",
  "can_prescribe_s4",
  "can_prescribe_s8",
].join(", ")

type StaffReadinessStatus = "pass" | "warn" | "fail"

interface StaffReadinessProfileRow {
  id: string
  auth_user_id: string | null
  email: string | null
  full_name: string | null
  role: "admin" | "doctor" | "support" | "patient" | string | null
  provider_number: string | null
  ahpra_number: string | null
  signature_storage_path: string | null
  parchment_user_id: string | null
  doctor_available: boolean | null
  can_review_med_certs: boolean | null
  can_review_repeat_rx: boolean | null
  can_review_consults: boolean | null
  can_review_ed: boolean | null
  can_review_hair_loss: boolean | null
  can_prescribe_s4: boolean | null
  can_prescribe_s8: boolean | null
}

export interface StaffReadinessCheck {
  id: string
  label: string
  status: StaffReadinessStatus
  detail: string
  href?: string
}

export interface StaffReadinessSnapshot {
  humanAdminCount: number
  doctorCount: number
  supportCount: number
  totalFailures: number
  totalWarnings: number
  ownerEmail: string
  doctorOnboarding: Record<DoctorOnboardingState, number>
  checks: StaffReadinessCheck[]
}

let lastAdminCountAlertKey: string | null = null

function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase()
}

function hasValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0
}

function maskEmail(email: string | null | undefined): string {
  const normalized = normalizeEmail(email)
  if (!normalized.includes("@")) return normalized || "(missing email)"
  const [name, domain] = normalized.split("@")
  const visible = name.length <= 2 ? `${name.slice(0, 1)}***` : `${name.slice(0, 2)}***`
  return `${visible}@${domain}`
}

function isSystemAdmin(profile: StaffReadinessProfileRow): boolean {
  return SYSTEM_ADMIN_EMAILS.has(normalizeEmail(profile.email)) || !profile.auth_user_id
}

function buildOwnerIdentityDetail(owner: StaffReadinessProfileRow | undefined): {
  missing: string[]
  paused: boolean
} {
  if (!owner) return { missing: ["owner admin profile"], paused: false }

  const missing: string[] = []
  if (!hasValue(owner.provider_number)) missing.push("provider number")
  if (!hasValue(owner.ahpra_number)) missing.push("AHPRA number")
  if (!hasValue(owner.signature_storage_path)) missing.push("signature")
  if (!hasValue(owner.parchment_user_id)) missing.push("Parchment user")

  return { missing, paused: owner.doctor_available === false }
}

function maybeAlertAdminCount(count: number, ownerEmail: string): void {
  if (count === 1) return
  const alertKey = `${count}:${ownerEmail}`
  if (lastAdminCountAlertKey === alertKey) return
  lastAdminCountAlertKey = alertKey

  Sentry.captureMessage("Staff readiness admin count drift", {
    level: "error",
    tags: {
      area: "staff-readiness",
      invariant: "human-admin-count",
    },
    extra: {
      humanAdminCount: count,
      ownerEmail: maskEmail(ownerEmail),
    },
  })
}

export async function getStaffReadinessSnapshot(): Promise<StaffReadinessSnapshot> {
  const ownerEmail = normalizeEmail(env("OWNER_ADMIN_EMAIL") || DEFAULT_OWNER_ADMIN_EMAIL)
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("profiles")
    .select(STAFF_SELECT)
    .in("role", ["admin", "doctor", "support"])
    .order("role", { ascending: true })

  if (error) {
    return {
      humanAdminCount: 0,
      doctorCount: 0,
      supportCount: 0,
      totalFailures: 1,
      totalWarnings: 0,
      ownerEmail,
      doctorOnboarding: {
        active: 0,
        capability_pending: 0,
        identity_pending: 0,
        invited: 0,
      },
      checks: [{
        id: "staff-role-read",
        label: "Staff role read",
        status: "fail",
        detail: "Could not read staff profiles. Check Supabase service role access.",
        href: "/admin/ops",
      }],
    }
  }

  const profiles = (data || []) as unknown as StaffReadinessProfileRow[]
  const admins = profiles.filter((profile) => profile.role === "admin")
  const humanAdmins = admins.filter((profile) => !isSystemAdmin(profile))
  const owner = humanAdmins.find((profile) => normalizeEmail(profile.email) === ownerEmail)
  const doctors = profiles.filter((profile) => profile.role === "doctor")
  const support = profiles.filter((profile) => profile.role === "support")
  const doctorProfiles = profiles.filter((profile) => profile.role === "admin" || profile.role === "doctor")
  const ownerIdentity = buildOwnerIdentityDetail(owner)

  const doctorOnboarding = doctorProfiles.reduce<Record<DoctorOnboardingState, number>>((acc, profile) => {
    const state = getDoctorOnboardingState(profile)
    acc[state] += 1
    return acc
  }, {
    active: 0,
    capability_pending: 0,
    identity_pending: 0,
    invited: 0,
  })

  maybeAlertAdminCount(humanAdmins.length, ownerEmail)

  const sentryRuntimeReady = Boolean(env("SENTRY_DSN") || env("NEXT_PUBLIC_SENTRY_DSN"))
  const sentryReleaseReady = Boolean(env("SENTRY_AUTH_TOKEN") && env("SENTRY_ORG") && env("SENTRY_PROJECT"))
  const dashboardSmokeReady = Boolean(env("DASHBOARD_SMOKE_COOKIE_HEADER") || env("DASHBOARD_SMOKE_ENABLED") === "1")

  const checks: StaffReadinessCheck[] = [
    {
      id: "single-admin",
      label: "Owner admin",
      status: humanAdmins.length === 1 && owner ? "pass" : "fail",
      detail: humanAdmins.length === 1 && owner
        ? `${maskEmail(owner.email)} is the only auth-linked human admin.`
        : `Expected one owner admin (${maskEmail(ownerEmail)}), found ${humanAdmins.length}.`,
      href: "/admin/settings",
    },
    {
      id: "owner-doctor-ready",
      label: "Admin doctor setup",
      status: ownerIdentity.missing.length === 0 && !ownerIdentity.paused ? "pass" : "fail",
      detail: ownerIdentity.missing.length === 0 && !ownerIdentity.paused
        ? "Owner admin is ready for certificates and embedded prescribing."
        : [
          ownerIdentity.missing.length > 0 ? `Missing ${ownerIdentity.missing.join(", ")}.` : null,
          ownerIdentity.paused ? "Doctor availability is paused." : null,
        ].filter(Boolean).join(" "),
      href: "/admin/settings/doctor-identity",
    },
    {
      id: "doctor-onboarding",
      label: "Future doctor onboarding",
      status: doctorOnboarding.identity_pending > 0 || doctorOnboarding.capability_pending > 0 ? "warn" : "pass",
      detail: `${doctorOnboarding.active} active, ${doctorOnboarding.invited} invited, ${doctorOnboarding.identity_pending} identity pending, ${doctorOnboarding.capability_pending} capability pending.`,
      href: "/admin/settings",
    },
    {
      id: "sentry",
      label: "Sentry release signal",
      status: sentryRuntimeReady && sentryReleaseReady ? "pass" : sentryRuntimeReady ? "warn" : "fail",
      detail: sentryRuntimeReady && sentryReleaseReady
        ? "Runtime DSN and release/project token env are present."
        : sentryRuntimeReady
          ? "Runtime capture is configured, but release/project token env is incomplete."
          : "Runtime Sentry DSN is missing.",
      href: "/admin/errors",
    },
    {
      id: "prod-dashboard-smoke",
      label: "Prod dashboard smoke",
      status: dashboardSmokeReady ? "pass" : "warn",
      detail: dashboardSmokeReady
        ? "Authenticated dashboard smoke is marked configured."
        : "Set the dashboard smoke cookie secret before relying on post-deploy auth checks.",
      href: "/dashboard",
    },
  ]

  return {
    humanAdminCount: humanAdmins.length,
    doctorCount: doctors.length,
    supportCount: support.length,
    totalFailures: checks.filter((check) => check.status === "fail").length,
    totalWarnings: checks.filter((check) => check.status === "warn").length,
    ownerEmail,
    doctorOnboarding,
    checks,
  }
}
