import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (filePath: string) => readFileSync(join(root, filePath), "utf8")

const retiredBlogAssets = [
  "public/images/blog/antibiotic-prescription-online-australia/antibiotic-red-flags.webp",
  "public/images/blog/antibiotic-prescription-online-australia/escript-pharmacy-pathway.webp",
  "public/images/blog/antibiotic-prescription-online-australia/telehealth-antibiotic-fit.webp",
  "public/images/blog/are-antibiotics-prescription-only-australia/schedule-four-gate.webp",
  "public/images/blog/are-antibiotics-prescription-only-australia/unsafe-antibiotic-sources.webp",
  "public/images/blog/are-antibiotics-prescription-only-australia/why-prescription-only.webp",
  "public/images/blog/how-escripts-work-australia/active-script-list-vs-token.webp",
  "public/images/blog/how-escripts-work-australia/escript-problem-solver.webp",
  "public/images/blog/how-escripts-work-australia/escript-token-pathway.webp",
  "public/images/blog/medical-certificate-online-australia/certificate-detail-check.webp",
  "public/images/blog/medical-certificate-online-australia/online-certificate-evidence-pathway.webp",
  "public/images/blog/medical-certificate-online-australia/telehealth-scope-boundary.webp",
] as const

const retiredStaticAssets = [
  "public/animations/Confetti.json",
  "public/animations/Empty State.json",
  "public/animations/Error.json",
  "public/animations/Loading Files.json",
  "public/animations/Loading.json",
  "public/animations/Notification.json",
  "public/animations/Success.json",
  "public/sounds/notification.mp3",
  "public/placeholder.svg",
  "public/images/ed-1.webp",
  "public/images/ed-2.webp",
  "public/icons/stickers/bandage.svg",
  "public/icons/stickers/brain.svg",
  "public/icons/stickers/lungs.svg",
  "public/icons/stickers/no-mobile.svg",
  "public/icons/stickers/syringe.svg",
  "public/icons/stickers/verified-badge.svg",
  "public/logos/JMIRO.png",
  "public/logos/NHMRC.png",
  "public/logos/RACGP.png",
  "public/logos/RANZCR.png",
  "public/logos/acpsem.png",
  "public/logos/anthropic.png",
  "public/logos/claude.png",
  "public/logos/clerk.png",
  "public/logos/eRx.png",
  "public/logos/next.js.png",
  "public/logos/stripe.png",
  "public/logos/supabase.png",
  "public/logos/vercel.png",
  "public/logos/wiley.png",
  "public/logos/payment/paypal.svg",
] as const

const retiredStickerNames = [
  "bandage",
  "brain",
  "lungs",
  "no-mobile",
  "syringe",
  "verified-badge",
] as const

describe("public asset retirement", () => {
  it("keeps unregistered blog visuals and retired static assets out of public", () => {
    for (const assetPath of [...retiredBlogAssets, ...retiredStaticAssets]) {
      expect(existsSync(join(root, assetPath)), assetPath).toBe(false)
    }
  })

  it("keeps retired sticker names out of the StickerIcon API", () => {
    const stickerSource = read("components/icons/stickers/index.tsx")
    for (const name of retiredStickerNames) {
      expect(stickerSource, name).not.toContain(`| '${name}'`)
    }
  })

  it("guards retired static assets and exact blog registry parity", () => {
    const orphanCheck = read("scripts/check-orphaned-files.sh")
    for (const assetPath of retiredStaticAssets) {
      expect(orphanCheck, assetPath).toContain(`"${assetPath}"`)
    }

    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>
    }
    const parityScript = read("scripts/check-blog-visual-assets.ts")
    expect(packageJson.scripts?.["content:audit:assets"]).toBe(
      "tsx scripts/check-blog-visual-assets.ts",
    )
    expect(packageJson.scripts?.["content:audit:images"]).toContain(
      "tsx scripts/check-blog-visual-assets.ts",
    )
    expect(parityScript).toContain("getAllTopArticleVisuals")
    expect(parityScript).toContain("Missing deployed assets")
    expect(parityScript).toContain("Unregistered deployed assets")
  })
})
