import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}))

import { AuthConfirmClient } from "@/app/auth/confirm/auth-confirm-client"

describe("auth confirmation server render", () => {
  it("shows a neutral state until the browser can inspect the secure fragment", () => {
    const html = renderToStaticMarkup(<AuthConfirmClient />)

    expect(html).toContain("Checking your secure link")
    expect(html).not.toContain("This link can&#x27;t be confirmed")
    expect(html).not.toContain("The confirmation details are missing or incomplete")
    expect(html).not.toContain('href="/sign-in"')
  })
})
