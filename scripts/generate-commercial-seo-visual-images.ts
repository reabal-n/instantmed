/* eslint-disable no-console */

import fs from "node:fs/promises"
import path from "node:path"

import { gateway, generateImage } from "ai"
import dotenv from "dotenv"
import sharp from "sharp"

import {
  type CommercialSeoVisualId,
  type CommercialSeoVisualItem,
  commercialSeoVisualList,
  type CommercialSeoVisualSpec,
  getCommercialSeoVisual,
} from "@/lib/seo/commercial-visuals"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })

const WIDTH = 1440
const HEIGHT = 1080
const GPT_IMAGE_MODEL = "openai/gpt-image-2"
const DEFAULT_GATEWAY_SIZE = "1536x1024"
const supportedGatewaySizes = ["1024x1024", "1024x1536", "1536x1024"] as const
type GatewayImageSize = (typeof supportedGatewaySizes)[number]

const BRAND_BADGE_WIDTH = 252
const BRAND_BADGE_HEIGHT = 54
const BRAND_BADGE_MARGIN = 28
const BRAND_LOGO_PATH = path.join(process.cwd(), "public", "branding", "logo.png")
const BRAND_WORDMARK_PATH = path.join(process.cwd(), "public", "branding", "wordmark.png")

const tonePalette: Record<NonNullable<CommercialSeoVisualItem["tone"]>, { bg: string; fg: string; border: string }> = {
  caution: { bg: "#fff7df", fg: "#945b00", border: "#f2c15d" },
  neutral: { bg: "#f5f8fc", fg: "#334155", border: "#cbd5e1" },
  safe: { bg: "#edf8f3", fg: "#0f6b4a", border: "#8bd3b2" },
  urgent: { bg: "#fff0f0", fg: "#b42318", border: "#f2aaa5" },
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const equalsArg = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
  if (equalsArg) return equalsArg
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

function configureGatewayAuth() {
  process.env.AI_GATEWAY_API_KEY ||= process.env.VERCEL_AI_GATEWAY_API_KEY
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
    delete process.env.OPENAI_API_KEY
  }
}

function assertGatewayAuth() {
  configureGatewayAuth()
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("Missing AI Gateway auth. Run `vercel env pull .env.local --yes` or set AI_GATEWAY_API_KEY.")
  }
}

function getGatewayImageSize(): GatewayImageSize {
  const size = getArg("size")
  if (!size) return DEFAULT_GATEWAY_SIZE
  if (supportedGatewaySizes.includes(size as GatewayImageSize)) return size as GatewayImageSize
  throw new Error(`Unsupported --size "${size}". Use ${supportedGatewaySizes.join(", ")}.`)
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines
}

function textBlock({
  text,
  x,
  y,
  width,
  size,
  weight = 500,
  color,
  lineHeight = Math.round(size * 1.28),
  maxLines,
}: {
  text: string
  x: number
  y: number
  width: number
  size: number
  weight?: number
  color: string
  lineHeight?: number
  maxLines?: number
}) {
  const maxChars = Math.max(12, Math.floor(width / (size * 0.52)))
  let lines = wrapText(text, maxChars)

  if (maxLines && lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
  }

  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" fill="${color}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`,
    )
    .join("")
}

function renderItemCard(item: CommercialSeoVisualItem, index: number) {
  const cardWidth = 306
  const cardHeight = 176
  const gap = 24
  const x = 64 + index * (cardWidth + gap)
  const y = 820
  const tone = tonePalette[item.tone ?? "neutral"]

  return `
    <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="18" fill="${tone.bg}" stroke="${tone.border}" stroke-width="2"/>
    <circle cx="${x + 34}" cy="${y + 38}" r="17" fill="#ffffff" stroke="${tone.border}" stroke-width="2"/>
    <text x="${x + 34}" y="${y + 45}" text-anchor="middle" fill="${tone.fg}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800">${index + 1}</text>
    ${textBlock({ text: item.label, x: x + 64, y: y + 44, width: cardWidth - 88, size: 25, weight: 800, color: "#172033", maxLines: 1 })}
    ${textBlock({ text: item.detail, x: x + 30, y: y + 96, width: cardWidth - 60, size: 21, weight: 500, color: "#475569", maxLines: 2 })}
  `
}

function renderOverlaySvg(spec: CommercialSeoVisualSpec) {
  return `
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#f8f7f4" opacity="0.3"/>
    <rect x="48" y="48" width="650" height="350" rx="28" fill="#ffffff" opacity="0.98" stroke="#dbe5ef" stroke-width="2"/>
    <text x="86" y="104" fill="#2563eb" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="1.6">${escapeXml(spec.eyebrow.toUpperCase())}</text>
    ${textBlock({ text: spec.title, x: 86, y: 164, width: 570, size: 48, weight: 850, color: "#172033", lineHeight: 58, maxLines: 2 })}
    ${textBlock({ text: spec.summary, x: 86, y: 286, width: 560, size: 25, weight: 500, color: "#475569", lineHeight: 34, maxLines: 3 })}
    <path d="M734 214 C852 140 990 150 1084 236 C1172 316 1284 320 1364 270" fill="none" stroke="#2563eb" stroke-width="12" stroke-linecap="round" opacity="0.34"/>
    <path d="M766 386 C894 302 1014 314 1118 410 C1214 500 1292 506 1362 460" fill="none" stroke="#ff6b5b" stroke-width="10" stroke-linecap="round" opacity="0.32"/>
    <circle cx="792" cy="218" r="15" fill="#2563eb" opacity="0.68"/>
    <circle cx="1084" cy="236" r="15" fill="#2563eb" opacity="0.68"/>
    <circle cx="1118" cy="410" r="15" fill="#ff6b5b" opacity="0.7"/>
    <rect x="48" y="792" width="1344" height="224" rx="30" fill="#ffffff" opacity="0.96" stroke="#dbe5ef" stroke-width="2"/>
    ${spec.items.slice(0, 4).map(renderItemCard).join("")}
  </svg>`
}

function buildGatewayPrompt(spec: CommercialSeoVisualSpec, styleShift: number, size: GatewayImageSize) {
  const shifts = [
    "Style lane: premium Australian health-editorial infographic underlay with layered paper texture, soft morning light, subtle depth, and structured clinical diagrams.",
    "Style lane: modern healthcare decision-map underlay with calm process lines, privacy-safe document shapes, realistic shadows, and restrained blue-coral accents.",
    "Style lane: polished product-education poster underlay with abstract workflow objects, translucent safety layers, and clear negative space for deterministic labels.",
  ]

  return [
    "Use case: scientific-educational.",
    "Asset type: 4:3 commercial SEO visual for a premium Australian telehealth website.",
    `Output size: ${size}. The final crop will be 1440x1080.`,
    `Primary request: ${spec.prompt}`,
    shifts[Math.abs(styleShift) % shifts.length],
    "Create only the visual underlay. Deterministic SVG labels and brand wordmark will be added after generation.",
    "No visible text, labels, headings, captions, logos, brand names, price, buttons, watermarks, signatures, QR codes, barcodes, certificate numbers, patient names, medicine names, drug packaging, pharmacy logos, government logos, doctor faces, patient faces, fake chat UI, fake app UI, fake official forms, or usable medical documents.",
    "Use visual structure instead: abstract document zones, privacy bands, calendar blocks, route lines, safety checkpoints, redirection branches, review nodes, verification markers, eScript-token shapes where relevant, and calm clinical colour zones.",
    "Make the underlay useful and specific, not a generic stock photo, beige desk flat lay, empty phone mockup, isolated icon row, stethoscope still life, or abstract blob background.",
    "Australian context should be subtle and non-promotional: warm ivory canvas, late-morning light, restrained blue, coral, amber, and eucalyptus-toned accents only where useful.",
    `Topic tags: ${spec.tags.join(", ")}.`,
  ].join("\n")
}

async function addInstantMedWordmark(filepath: string) {
  const tempPath = `${filepath}.tmp.webp`
  const badgeSvg = Buffer.from(`
    <svg width="${BRAND_BADGE_WIDTH}" height="${BRAND_BADGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${BRAND_BADGE_WIDTH}" height="${BRAND_BADGE_HEIGHT}" rx="20" fill="#ffffff" opacity="0.93" stroke="#dbe5ef" stroke-width="1.5"/>
    </svg>
  `)
  const logo = await sharp(BRAND_LOGO_PATH).resize(34, 34, { fit: "contain" }).png().toBuffer()
  const wordmark = await sharp(BRAND_WORDMARK_PATH).resize(158, 25, { fit: "contain" }).png().toBuffer()
  const left = WIDTH - BRAND_BADGE_WIDTH - BRAND_BADGE_MARGIN
  const top = HEIGHT - BRAND_BADGE_HEIGHT - BRAND_BADGE_MARGIN

  await sharp(filepath)
    .composite([
      { input: badgeSvg, left, top },
      { input: logo, left: left + 18, top: top + 10 },
      { input: wordmark, left: left + 62, top: top + 15 },
    ])
    .webp({ quality: 86, effort: 5 })
    .toFile(tempPath)

  await fs.rename(tempPath, filepath)
}

async function saveGatewayVisual(spec: CommercialSeoVisualSpec, styleShift: number, size: GatewayImageSize) {
  const outputPath = path.join(process.cwd(), "public", spec.assetPath.replace(/^\//, ""))
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  const result = await generateImage({
    model: gateway.image(GPT_IMAGE_MODEL),
    prompt: buildGatewayPrompt(spec, styleShift, size),
    size,
    providerOptions: {
      gateway: {
        tags: ["feature:commercial-seo-visuals", `visual:${spec.id}`, "renderer:gpt-image-2", `style-shift:${styleShift}`],
      },
    },
  })

  await sharp(Buffer.from(result.image.uint8Array))
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "attention", background: "#f8f7f4" })
    .composite([{ input: Buffer.from(renderOverlaySvg(spec)), left: 0, top: 0 }])
    .webp({ quality: 86, effort: 5 })
    .toFile(outputPath)

  await addInstantMedWordmark(outputPath)
  return outputPath
}

async function main() {
  const id = getArg("id") as CommercialSeoVisualId | undefined
  const limit = Number(getArg("limit") ?? "0")
  const styleShift = Number(getArg("style-shift") ?? "0")
  const size = getGatewayImageSize()
  const dryRun = hasFlag("dry-run")
  const force = hasFlag("force")

  assertGatewayAuth()

  const requested = id ? [getCommercialSeoVisual(id)] : commercialSeoVisualList
  const jobs = requested.slice(0, limit > 0 ? limit : undefined)

  for (const spec of jobs) {
    const outputPath = path.join(process.cwd(), "public", spec.assetPath.replace(/^\//, ""))

    if (dryRun) {
      console.log(`\n--- ${spec.id} (${GPT_IMAGE_MODEL}) ---\n${buildGatewayPrompt(spec, styleShift, size)}`)
      continue
    }

    if (!force) {
      try {
        await fs.access(outputPath)
        console.log(`Skipping existing ${path.relative(process.cwd(), outputPath)}`)
        continue
      } catch {
        // Missing file is expected.
      }
    }

    console.log(`Generating ${GPT_IMAGE_MODEL} visual ${spec.id} (${spec.title})...`)
    const saved = await saveGatewayVisual(spec, styleShift, size)
    console.log(`Saved ${path.relative(process.cwd(), saved)}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
