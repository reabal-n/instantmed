/* eslint-disable no-console */

import fs from "node:fs/promises"
import path from "node:path"

import { openai } from "@ai-sdk/openai"
import type { ToolSet } from "ai"
import { generateText } from "ai"
import dotenv from "dotenv"
import sharp from "sharp"

import type { ArticleVisual } from "@/lib/blog/visuals"
import { getAllTopArticleVisuals, TOP_VISUAL_ARTICLE_SLUGS } from "@/lib/blog/visuals"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })

interface ImageToolResult {
  toolName: string
  output?: {
    result?: string
  }
}

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

function assertGatewayAuth() {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error(
      "Missing AI Gateway auth. Run `vercel env pull .env.local --yes` or set AI_GATEWAY_API_KEY.",
    )
  }
}

function getInfographicLayoutPrompt(kind: ArticleVisual["kind"]): string {
  switch (kind) {
    case "comparison":
      return "Use a clear infographic comparison layout: distinct side-by-side or three-panel zones, repeated shapes for like-for-like comparison, and visible visual contrast between categories."
    case "flow":
      return "Use a clear infographic flow layout: sequential nodes connected by arrows or pathways, with a visible start, middle, and end."
    case "timeline":
      return "Use a clear infographic timeline layout: ordered milestones along a horizontal or vertical axis, with consistent spacing and progression."
    case "warning":
      return "Use a clear infographic warning or triage layout: decision split, caution marker, and safe-vs-urgent pathway without alarmist imagery."
    case "checklist":
      return "Use a clear infographic checklist layout: stacked cards, check markers, and grouped criteria rather than a decorative still life."
    case "spectrum":
      return "Use a clear infographic spectrum layout: graded zones, continuum, or layered stack that shows increasing intensity or categories."
  }
}

function buildPrompt(slug: string, visual: ArticleVisual): string {
  return [
    visual.imagePrompt,
    "",
    "Use InstantMed's brand direction: calm, authoritative, crisp, Australian context, morning light, warm ivory background, sky blue and restrained clinical accents.",
    "This is for a patient health guide, not advertising. It must feel educational, trustworthy, and quiet.",
    "Make the generated asset an infographic-style diagram, not a plain stock-like photo or decorative still life.",
    getInfographicLayoutPrompt(visual.kind),
    `Use approximately ${visual.items.length} visual zones or nodes so the raster image matches the structured guide content.`,
    "Do not put written labels inside the image. The website renders the real labels, captions, and explanations in HTML beside the image for accuracy and accessibility.",
    "Do not include readable text, labels, fake app screens, fake certificates, fake doctor faces, celebrity likenesses, graphic symptoms, blood, gore, brand logos, medication brand names, pill imprints, official seals, or medical crosses.",
    "Avoid human figures unless the article prompt explicitly requires them. If people appear, make them candid and non-identifiable, not looking at camera.",
    `Article slug: ${slug}. Visual concept: ${visual.title}.`,
  ].join("\n")
}

async function saveOpenAIImageResult(slug: string, visualId: string, results: ImageToolResult[]) {
  const image = results.find((result) => result.toolName === "image_generation" && result.output?.result)
  if (!image?.output?.result) {
    throw new Error(`No image_generation result returned for ${slug}/${visualId}`)
  }

  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visualId}.webp`)
  const original = Buffer.from(image.output.result, "base64")
  const optimized = await sharp(original)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer()
  await fs.writeFile(filepath, optimized)
  return filepath
}

async function main() {
  const slugFilter = getArg("slug")
  const limit = Number(getArg("limit") ?? "0")
  const dryRun = hasFlag("dry-run")
  const force = hasFlag("force")

  assertGatewayAuth()

  const visualsBySlug = getAllTopArticleVisuals()
  const jobs = TOP_VISUAL_ARTICLE_SLUGS
    .filter((slug) => !slugFilter || slug === slugFilter)
    .flatMap((slug) => visualsBySlug[slug].map((visual) => ({ slug, visual })))
    .slice(0, limit > 0 ? limit : undefined)

  if (jobs.length === 0) {
    throw new Error(`No visual jobs found${slugFilter ? ` for --slug=${slugFilter}` : ""}.`)
  }

  for (const { slug, visual } of jobs) {
    const filepath = path.join(process.cwd(), "public", "images", "blog", slug, `${visual.id}.webp`)
    if (!force) {
      try {
        await fs.access(filepath)
        console.log(`Skipping existing ${path.relative(process.cwd(), filepath)}`)
        continue
      } catch {
        // Missing file is expected.
      }
    }

    const prompt = buildPrompt(slug, visual)
    if (dryRun) {
      console.log(`\n--- ${slug}/${visual.id} ---\n${prompt}`)
      continue
    }

    console.log(`Generating ${slug}/${visual.id}...`)
    const imageGenerationTool = openai.tools.imageGeneration({
      outputFormat: "webp",
      quality: "high",
      size: "1536x1024",
    }) as unknown as ToolSet[string]

    const result = await generateText({
      model: "openai/gpt-5.1-instant",
      prompt,
      tools: {
        image_generation: imageGenerationTool,
      },
    })

    const saved = await saveOpenAIImageResult(slug, visual.id, result.staticToolResults as ImageToolResult[])
    console.log(`Saved ${path.relative(process.cwd(), saved)}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
