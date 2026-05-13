#!/usr/bin/env npx tsx
/* eslint-disable no-console */

import path from "node:path"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })

const DEFAULT_OWNER_ADMIN_EMAIL = "me@reabal.ai"
const ALLOWED_TARGET_ROLES = new Set(["doctor", "support", "patient"])

interface AdminProfileRow {
  id: string
  auth_user_id: string | null
  email: string | null
  role: string | null
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase()
}

function maskEmail(email: string | null | undefined): string {
  const normalized = normalizeEmail(email)
  if (!normalized.includes("@")) return normalized || "(missing email)"

  const [name, domain] = normalized.split("@")
  const visibleName = name.length <= 2 ? `${name.slice(0, 1)}***` : `${name.slice(0, 2)}***`
  return `${visibleName}@${domain}`
}

function parseCsv(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean)
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
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

async function loadHumanAdmins(supabase: SupabaseClient): Promise<AdminProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id, email, role")
    .eq("role", "admin")
    .not("auth_user_id", "is", null)

  if (error) {
    throw new Error(`Failed to load human admin profiles: ${error.message}`)
  }

  return (data || []) as unknown as AdminProfileRow[]
}

async function applyDemotion(supabase: SupabaseClient, profile: AdminProfileRow, targetRole: string): Promise<void> {
  const { error } = await supabase.rpc("admin_change_profile_role", {
    p_profile_id: profile.id,
    p_target_role: targetRole,
    p_reason: "Normalize InstantMed staff roles to one auth-linked human admin.",
  })

  if (error) {
    throw new Error(`Failed to demote ${maskEmail(profile.email)}: ${error.message}`)
  }
}

async function main(): Promise<void> {
  const apply = hasFlag("--apply")
  const ownerEmail = normalizeEmail(env("OWNER_ADMIN_EMAIL") || DEFAULT_OWNER_ADMIN_EMAIL)
  const targetRole = normalizeEmail(env("DEMOTE_ADMIN_ROLE") || "patient")
  const explicitEmails = parseCsv(env("DEMOTE_ADMIN_EMAILS"))
  const demoteAllExtraAdmins = env("DEMOTE_ALL_EXTRA_ADMINS") === "1" || hasFlag("--all-extra-admins")

  if (!ALLOWED_TARGET_ROLES.has(targetRole)) {
    throw new Error("DEMOTE_ADMIN_ROLE must be one of: doctor, support, patient.")
  }
  if (explicitEmails.length === 0 && !demoteAllExtraAdmins) {
    throw new Error("Set DEMOTE_ADMIN_EMAILS=email@example.com or pass --all-extra-admins. This script is dry-run by default; add --apply to write.")
  }
  if (explicitEmails.includes(ownerEmail)) {
    throw new Error("Refusing to demote OWNER_ADMIN_EMAIL.")
  }

  const supabase = await createSupabase()
  const admins = await loadHumanAdmins(supabase)
  const owner = admins.find((profile) => normalizeEmail(profile.email) === ownerEmail)
  if (!owner) {
    throw new Error(`Owner admin ${maskEmail(ownerEmail)} was not found. Refusing to continue.`)
  }

  const targets = admins.filter((profile) => {
    const email = normalizeEmail(profile.email)
    if (email === ownerEmail) return false
    if (demoteAllExtraAdmins) return true
    return explicitEmails.includes(email)
  })

  const missingEmails = explicitEmails.filter((email) => !admins.some((profile) => normalizeEmail(profile.email) === email))
  if (missingEmails.length > 0) {
    throw new Error(`Requested demotion email(s) not found as human admins: ${missingEmails.map(maskEmail).join(", ")}.`)
  }
  if (targets.length === 0) {
    console.log("No extra human admin profiles to demote.")
    return
  }

  console.log(`${apply ? "Applying" : "Dry run"} staff admin normalization`)
  console.log(`Owner admin kept as admin: ${maskEmail(owner.email)}`)
  console.log(`Target role for extra admin(s): ${targetRole}`)
  for (const target of targets) {
    console.log(`- ${maskEmail(target.email)}: admin -> ${targetRole}`)
  }

  if (!apply) {
    console.log("")
    console.log("No changes written. Re-run with --apply after reviewing the target list.")
    return
  }

  for (const target of targets) {
    await applyDemotion(supabase, target, targetRole)
  }

  console.log("")
  console.log("Staff admin normalization applied. Run pnpm check:staff-roles next.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
