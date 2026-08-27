import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs"
import { extname, join } from "node:path"

import { describe, expect, it } from "vitest"

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

function publicTextFiles(root: string): string[] {
  const absoluteRoot = join(process.cwd(), root)
  const files: string[] = []

  for (const entry of readdirSync(absoluteRoot)) {
    const absolutePath = join(absoluteRoot, entry)
    if (statSync(absolutePath).isDirectory()) {
      files.push(...publicTextFiles(join(root, entry)))
      continue
    }

    if ([".js", ".jsx", ".json", ".md", ".mdx", ".ts", ".tsx", ".txt", ".xml"]
      .includes(extname(entry))) {
      files.push(absolutePath)
    }
  }

  return files
}

describe("Lena Medical Director voice-message contracts", () => {
  it("keeps confirmed message content encrypted and service-role only", () => {
    const migration = read(
      "supabase/migrations/20260827210500_twilio_voice_callback_requests.sql",
    )

    expect(migration).toContain("CREATE TABLE public.medical_director_voice_messages")
    expect(migration).toContain("payload_enc jsonb NOT NULL")
    expect(migration).toContain(
      "ALTER TABLE public.medical_director_voice_messages ENABLE ROW LEVEL SECURITY",
    )
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.medical_director_voice_messages FROM anon, authenticated",
    )
    expect(migration).toContain(
      "GRANT ALL ON TABLE public.medical_director_voice_messages TO service_role",
    )
    expect(migration).not.toMatch(/\bcaller_phone\b/)
    expect(migration).not.toMatch(/\bcall_sid\b(?!_fingerprint)/)
    expect(migration).not.toMatch(/\btranscript\b\s+(text|jsonb)/)
  })

  it("matches bounded name candidates against encrypted date of birth server-side", () => {
    const service = read("lib/twilio/medical-director-voice-message.ts")

    expect(service).toContain(
      '.select("id, full_name, date_of_birth, date_of_birth_encrypted")',
    )
    expect(service).toContain('.ilike("full_name"')
    expect(service).toContain("decryptField<string>(row.date_of_birth_encrypted)")
    expect(service).toContain(".limit(25)")
  })

  it("deletes only resolved payloads after the bounded 30-day retention window", () => {
    const migration = read(
      "supabase/migrations/20260827210500_twilio_voice_callback_requests.sql",
    )

    expect(migration).toContain("p_retention_days integer DEFAULT 30")
    expect(migration).toContain("WHERE status = 'resolved'")
    expect(migration).toContain(
      "resolved_at < now() - make_interval(days => p_retention_days)",
    )
    expect(migration).toContain("p_retention_days < 7")
    expect(migration).toContain("p_retention_days > 365")
  })

  it("keeps the inbox admin-only and PHI out of list queries", () => {
    const inboxPage = read("app/admin/ops/voice-messages/page.tsx")
    const detailPage = read("app/admin/ops/voice-messages/[id]/page.tsx")
    const actions = read("app/actions/medical-director-voice-messages.ts")
    const opsClient = read("app/admin/ops/ops-client.tsx")
    const service = read("lib/admin/medical-director-voice-messages.ts")
    const navigation = read("lib/dashboard/staff-navigation.ts")
    const listImplementation = service.split(
      "export async function getMedicalDirectorVoiceMessageDetail",
    )[0]
    const supportNavigation = navigation
      .split("export const supportNavSections")[1]
      .split("export function getStaffNav")[0]

    expect(inboxPage).toContain('requireRole(["admin"])')
    expect(detailPage).toContain('requireRole(["admin"])')
    expect(actions).toContain('requireRoleOrNull(["admin"])')
    expect(listImplementation).not.toContain("payload_enc")
    expect(listImplementation).not.toContain("profiles")
    expect(opsClient).toContain("ADMIN_VOICE_MESSAGES_HREF")
    expect(opsClient).toContain("{isAdmin ? (")
    expect(supportNavigation).not.toContain("ADMIN_VOICE_MESSAGES_HREF")
  })

  it("routes calls directly to Lena and has no retired consent endpoint", () => {
    const incoming = read("app/api/webhooks/twilio/voice/incoming/route.ts")
    const realtime = read("lib/twilio/openai-realtime.ts")

    expect(existsSync(join(
      process.cwd(),
      "app/api/webhooks/twilio/voice/consent/route.ts",
    ))).toBe(false)
    expect(incoming).toContain("response.connect()")
    expect(incoming).toContain('getTwilioVoiceWebSocketUrl("/api/webhooks/twilio/voice/stream")')
    expect(incoming).not.toContain("/voice/consent")
    expect(realtime).toContain(
      "Hi, this is Lena from InstantMed support. How can I help?",
    )
  })

  it("publishes the new number and removes the retired number from public surfaces", () => {
    const constants = read("lib/constants/index.ts")
    const navbar = read("components/shared/navbar.tsx")
    const mobileMenu = read("components/shared/navbar/mobile-menu-content.tsx")
    const privacy = read("app/privacy/page.tsx")
    const publicSurface = [
      ...publicTextFiles("app"),
      ...publicTextFiles("components"),
      ...publicTextFiles("public"),
      join(process.cwd(), "lib/constants/index.ts"),
    ].map((path) => readFileSync(path, "utf8")).join("\n")

    expect(constants).toContain('CONTACT_PHONE = "0495 049 555"')
    expect(constants).toContain('CONTACT_PHONE_TEL = "+61495049555"')
    expect(navbar).toContain('href={`tel:${CONTACT_PHONE_TEL}`}')
    expect(mobileMenu).toContain('label: `Call ${CONTACT_PHONE}`')
    expect(privacy).toContain("Lena, an automated voice assistant")
    expect(privacy).toContain("We do not retain the raw call audio or a full")
    expect(publicSurface).not.toContain("0450 722 549")
    expect(publicSurface).not.toContain("0450722549")
  })
})
