#!/usr/bin/env npx tsx
/* eslint-disable no-console */

import path from "node:path"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })

const DEFAULT_OWNER_ADMIN_EMAIL = "me@reabal.ai"
const SYSTEM_ADMIN_EMAILS = new Set(["system@instantmed.com.au"])

type StaffRole = "admin" | "doctor" | "support" | "patient"

interface StaffProfileRow {
  id: string
  auth_user_id: string | null
  email: string | null
  full_name: string | null
  role: StaffRole | string | null
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

interface RoleCheckResult {
  profiles: StaffProfileRow[]
  issues: string[]
  warnings: string[]
}

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
  const visibleName = name.length <= 2 ? `${name.slice(0, 1)}***` : `${name.slice(0, 2)}***`
  return `${visibleName}@${domain}`
}

function describeProfile(profile: StaffProfileRow): string {
  return `${maskEmail(profile.email)} (${profile.role || "missing role"}, ${profile.auth_user_id ? "auth-linked" : "no auth user"})`
}

function isSystemAdmin(profile: StaffProfileRow): boolean {
  return SYSTEM_ADMIN_EMAILS.has(normalizeEmail(profile.email)) || !profile.auth_user_id
}

function needsPrescribingIdentity(profile: StaffProfileRow): boolean {
  return profile.can_prescribe_s4 !== false || profile.can_prescribe_s8 === true
}

function needsCertificateIdentity(profile: StaffProfileRow): boolean {
  return profile.can_review_med_certs !== false
}

async function createSupabase(): Promise<SupabaseClient> {
  const supabaseUrl = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

async function loadStaffProfiles(supabase: SupabaseClient): Promise<StaffProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(STAFF_SELECT)
    .in("role", ["admin", "doctor", "support"])
    .order("role", { ascending: true })

  if (error) {
    throw new Error(`Failed to load staff profiles: ${error.message}`)
  }

  return (data || []) as unknown as StaffProfileRow[]
}

function checkOwnerAdmin(owner: StaffProfileRow, issues: string[], warnings: string[]): void {
  if (owner.role !== "admin") {
    issues.push(`Owner profile must have role=admin, got ${owner.role || "missing role"}.`)
  }
  if (!owner.auth_user_id) {
    issues.push("Owner admin must be linked to a Supabase auth user.")
  }
  if (!hasValue(owner.provider_number)) {
    issues.push("Owner admin is missing provider_number.")
  }
  if (!hasValue(owner.ahpra_number)) {
    issues.push("Owner admin is missing ahpra_number.")
  }
  if (!hasValue(owner.signature_storage_path)) {
    issues.push("Owner admin is missing signature_storage_path for medical certificates.")
  }
  if (!hasValue(owner.parchment_user_id)) {
    issues.push("Owner admin is missing parchment_user_id for embedded prescribing.")
  }
  if (owner.doctor_available === false && env("ALLOW_OWNER_ADMIN_PAUSED") !== "1") {
    issues.push("Owner admin doctor availability is paused. Set ALLOW_OWNER_ADMIN_PAUSED=1 only for an intentional paused release.")
  }

  const disabledCapabilities = [
    ["med certificates", owner.can_review_med_certs],
    ["repeat scripts", owner.can_review_repeat_rx],
    ["consults", owner.can_review_consults],
    ["ED", owner.can_review_ed],
    ["hair loss", owner.can_review_hair_loss],
    ["S4 prescribing", owner.can_prescribe_s4],
  ]
    .filter(([, value]) => value === false)
    .map(([label]) => label)

  if (disabledCapabilities.length > 0) {
    warnings.push(`Owner admin has disabled capability flags: ${disabledCapabilities.join(", ")}. Admin access bypasses service scoping in app code, but this should still be intentional.`)
  }
}

function checkDoctor(profile: StaffProfileRow, issues: string[], warnings: string[]): void {
  if (!profile.auth_user_id) {
    warnings.push(`Doctor profile ${describeProfile(profile)} is not auth-linked yet.`)
    return
  }

  if (!hasValue(profile.provider_number)) {
    issues.push(`Doctor ${maskEmail(profile.email)} is missing provider_number.`)
  }
  if (!hasValue(profile.ahpra_number)) {
    issues.push(`Doctor ${maskEmail(profile.email)} is missing ahpra_number.`)
  }
  if (needsCertificateIdentity(profile) && !hasValue(profile.signature_storage_path)) {
    issues.push(`Doctor ${maskEmail(profile.email)} can review certificates but is missing signature_storage_path.`)
  }
  if (needsPrescribingIdentity(profile) && !hasValue(profile.parchment_user_id)) {
    issues.push(`Doctor ${maskEmail(profile.email)} can prescribe but is missing parchment_user_id.`)
  }
}

function evaluateProfiles(profiles: StaffProfileRow[], ownerEmail: string): RoleCheckResult {
  const issues: string[] = []
  const warnings: string[] = []

  const admins = profiles.filter((profile) => profile.role === "admin")
  const humanAdmins = admins.filter((profile) => !isSystemAdmin(profile))
  const owner = humanAdmins.find((profile) => normalizeEmail(profile.email) === ownerEmail)
  const unexpectedHumanAdmins = humanAdmins.filter((profile) => normalizeEmail(profile.email) !== ownerEmail)

  if (humanAdmins.length !== 1) {
    issues.push(`Expected exactly one auth-linked human admin; found ${humanAdmins.length}.`)
  }
  if (!owner) {
    issues.push(`Owner admin profile not found for ${maskEmail(ownerEmail)}.`)
  } else {
    checkOwnerAdmin(owner, issues, warnings)
  }
  if (unexpectedHumanAdmins.length > 0) {
    issues.push(`Unexpected human admin profile(s): ${unexpectedHumanAdmins.map(describeProfile).join(", ")}. Demote these to doctor/support/patient before release.`)
  }

  const systemAdmins = admins.filter(isSystemAdmin)
  const nonCanonicalSystemAdmins = systemAdmins.filter((profile) => {
    const email = normalizeEmail(profile.email)
    return profile.auth_user_id || (email && !SYSTEM_ADMIN_EMAILS.has(email))
  })
  if (nonCanonicalSystemAdmins.length > 0) {
    warnings.push(`Non-canonical system admin profile(s): ${nonCanonicalSystemAdmins.map(describeProfile).join(", ")}.`)
  }

  for (const profile of profiles) {
    if (profile.role === "doctor") {
      checkDoctor(profile, issues, warnings)
    }
  }

  return { profiles, issues, warnings }
}

async function main(): Promise<void> {
  const ownerEmail = normalizeEmail(env("OWNER_ADMIN_EMAIL") || DEFAULT_OWNER_ADMIN_EMAIL)
  const supabase = await createSupabase()
  const profiles = await loadStaffProfiles(supabase)
  const result = evaluateProfiles(profiles, ownerEmail)

  const humanAdmins = result.profiles.filter((profile) => profile.role === "admin" && !isSystemAdmin(profile))
  const doctors = result.profiles.filter((profile) => profile.role === "doctor")
  const support = result.profiles.filter((profile) => profile.role === "support")

  console.log("Staff role readiness")
  console.log(`Owner admin target: ${maskEmail(ownerEmail)}`)
  console.log(`Human admins: ${humanAdmins.length}`)
  console.log(`Doctors: ${doctors.length}`)
  console.log(`Support: ${support.length}`)

  if (result.warnings.length > 0) {
    console.log("")
    console.log("Warnings:")
    for (const warning of result.warnings) {
      console.log(`- ${warning}`)
    }
  }

  if (result.issues.length > 0) {
    console.error("")
    console.error("Blocking issues:")
    for (const issue of result.issues) {
      console.error(`- ${issue}`)
    }
    process.exit(1)
  }

  console.log("")
  console.log("Staff role readiness passed.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
