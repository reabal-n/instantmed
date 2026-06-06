/* eslint-disable no-console */

import fs from "node:fs/promises"
import path from "node:path"

import { gateway, generateImage } from "ai"
import dotenv from "dotenv"
import sharp from "sharp"

import {
  AUTHORITY_ASSETS,
  type AuthorityAsset,
  type AuthorityAssetVisual,
} from "@/lib/authority-assets"

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

interface VisualJob {
  asset: AuthorityAsset
  visual: AuthorityAssetVisual
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

function buildGatewayPrompt(asset: AuthorityAsset, visual: AuthorityAssetVisual, size: GatewayImageSize) {
  return [
    "Use case: source-backed public health explainer.",
    "Asset type: premium 4:3 authority-resource infographic for an Australian telehealth website.",
    `Output size: ${size}. The final saved crop will be 1440x1080.`,
    `Page title: ${asset.title}.`,
    `Visual title: ${visual.title}.`,
    `Primary request: ${visual.prompt}`,
    "Text rendering: use GPT image 2's native text rendering for concise labels. Keep labels large, crisp, correctly spelled, and easy to read on desktop and mobile.",
    "Composition: create a high-quality editorial explainer, not a decorative stock image. Use visible structure such as lanes, decision nodes, callout boxes, checklists, maps, pathways, or comparison panels.",
    "Brand feel: Australian clinical trust, warm morning light, refined navy, coral, eucalyptus, amber, and clean white space. Avoid a one-colour palette.",
    "Abstract-only rule: no people, no faces, no human photography, no body parts, no patient scenes, no doctor portraits, and no fake app screenshots.",
    "Source rule: do not create any source footer, citation, date, third-party publisher name, regulator name, or guideline label inside the image. Sources and captions are rendered in HTML outside the image.",
    "Compliance: no official logos, no fake government forms, no medical certificate numbers, no signatures, no QR codes, no patient identifiers, no medicine names, no drug packaging, no pricing, no buttons, no testimonials, no service guarantees, no booking instruction, no sales copy, and no emergency dramatics.",
    "The visual may include the word InstantMed only as a small neutral brand label. Do not make it the main subject.",
  ].join("\n")
}

function getOutputPath(visual: AuthorityAssetVisual) {
  return path.join(process.cwd(), "public", visual.assetPath.replace(/^\//, ""))
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
    .webp({ quality: 88, effort: 5 })
    .toFile(tempPath)

  await fs.rename(tempPath, filepath)
}

async function saveVisual(job: VisualJob, size: GatewayImageSize) {
  const outputPath = getOutputPath(job.visual)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  const result = await generateImage({
    model: gateway.image(GPT_IMAGE_MODEL),
    prompt: buildGatewayPrompt(job.asset, job.visual, size),
    size,
    providerOptions: {
      gateway: {
        tags: [
          "feature:authority-resource-visuals",
          `resource:${job.asset.slug}`,
          `visual:${job.visual.id}`,
          "renderer:gpt-image-2",
        ],
      },
    },
  })

  await sharp(Buffer.from(result.image.uint8Array))
    .resize(WIDTH, HEIGHT, { fit: "contain", position: "center", background: "#f8f7f4" })
    .webp({ quality: 88, effort: 5 })
    .toFile(outputPath)

  await addInstantMedWordmark(outputPath)
  return outputPath
}

function listJobs(): VisualJob[] {
  const slug = getArg("slug")
  const id = getArg("id")

  return AUTHORITY_ASSETS.flatMap((asset) =>
    (asset.visuals ?? []).map((visualItem) => ({
      asset,
      visual: visualItem,
    })),
  ).filter((job) => {
    if (slug && job.asset.slug !== slug) return false
    if (id && job.visual.id !== id) return false
    return true
  })
}

async function main() {
  const limit = Number(getArg("limit") ?? "0")
  const size = getGatewayImageSize()
  const dryRun = hasFlag("dry-run")
  const force = hasFlag("force")
  const jobs = listJobs().slice(0, limit > 0 ? limit : undefined)

  if (!jobs.length) {
    throw new Error("No authority resource visual jobs matched the requested filters.")
  }

  if (!dryRun) {
    assertGatewayAuth()
  }

  for (const job of jobs) {
    const outputPath = getOutputPath(job.visual)

    if (dryRun) {
      console.log(`\n--- ${job.asset.slug}/${job.visual.id} (${GPT_IMAGE_MODEL}) ---\n${buildGatewayPrompt(job.asset, job.visual, size)}`)
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

    console.log(`Generating ${GPT_IMAGE_MODEL} visual ${job.asset.slug}/${job.visual.id}...`)
    const saved = await saveVisual(job, size)
    console.log(`Saved ${path.relative(process.cwd(), saved)}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
