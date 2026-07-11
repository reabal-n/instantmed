import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function readProjectFile(path: string): string {
  const absolutePath = join(process.cwd(), path)
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : ""
}

const DIRECT_BROWSER_SIGN_OUT_PATHS = [
  "lib/supabase/auth-provider.tsx",
  "app/patient/settings/settings-client.tsx",
  "app/auth/account-closed/account-closed-client.tsx",
  "app/auth/reset-password/reset-password-client.tsx",
] as const

describe("service-worker privacy retirement", () => {
  it("serves a no-fetch tombstone that purges InstantMed caches and unregisters itself", () => {
    const source = readProjectFile("public/sw.js")

    expect(source).not.toContain("addEventListener('fetch'")
    expect(source).not.toContain("addEventListener('push'")
    expect(source).not.toContain("notificationclick")
    expect(source).toContain("name.startsWith('instantmed-')")
    expect(source).toContain("registration.unregister()")
    expect(source).toContain("clients.claim()")
  })

  it("provides one fail-soft helper for cache deletion and same-origin unregistration", () => {
    const source = readProjectFile("lib/security/browser-cache-cleanup.ts")

    expect(source).toContain("export async function clearInstantMedBrowserCaches")
    expect(source).toContain("Promise.allSettled(tasks)")
    expect(source).toContain("name.startsWith(\"instantmed-\")")
    expect(source).toContain("caches.delete(name)")
    expect(source).toContain("navigator.serviceWorker.getRegistrations()")
    expect(source).toContain("registration.unregister()")
  })

  it("keeps a temporary update bridge without registering a worker on clean clients", () => {
    const source = readProjectFile("components/pwa/service-worker-registration.tsx")

    expect(source).toContain("navigator.serviceWorker.getRegistrations()")
    expect(source).toContain("registration.update()")
    expect(source).toContain("clearInstantMedBrowserCaches()")
    expect(source).not.toContain("navigator.serviceWorker.register(")
    expect(source).not.toContain("window.confirm(")
  })

  it.each(DIRECT_BROWSER_SIGN_OUT_PATHS)(
    "%s purges browser caches before or alongside direct browser sign-out",
    (path) => {
      const source = readProjectFile(path)

      expect(source).toContain("clearInstantMedBrowserCaches")
      expect(source).toContain("clearInstantMedBrowserCaches()")
    },
  )

  it("keeps the mobile sign-out sheet above the persistent bottom navigation", () => {
    const source = readProjectFile("components/ui/mobile-nav.tsx")

    expect(source).toContain('className="lg:hidden fixed inset-0 z-[60]"')
    expect(source).toContain(
      'className="absolute bottom-0 left-0 right-0 z-10',
    )
  })
})
