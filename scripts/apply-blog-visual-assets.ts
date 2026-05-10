import fs from "node:fs"
import path from "node:path"

import { getArticleVisuals, TOP_VISUAL_ARTICLE_SLUGS } from "@/lib/blog/visuals"

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const equalsArg = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
  if (equalsArg) return equalsArg
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function getSlugFilters(): Set<string> | null {
  const singleSlug = getArg("slug")
  const slugList = getArg("slugs")
  const values = [
    ...(singleSlug ? [singleSlug] : []),
    ...(slugList ? slugList.split(",") : []),
  ]
    .map((slug) => slug.trim())
    .filter(Boolean)

  return values.length > 0 ? new Set(values) : null
}

function escapeYamlDoubleQuoted(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function removeRelatedServicesBlock(raw: string) {
  const lines = raw.split("\n")
  const nextLines: string[] = []
  let skipping = false

  for (const line of lines) {
    if (line === "relatedServices:") {
      skipping = true
      continue
    }

    if (skipping && /^[A-Za-z0-9_-]+:/.test(line)) {
      skipping = false
    }

    if (!skipping) {
      nextLines.push(line)
    }
  }

  return nextLines.join("\n")
}

function resolveArticleFilepath(slug: string) {
  const directPath = path.join(process.cwd(), "content", "blog", `${slug}.mdx`)
  if (fs.existsSync(directPath)) return directPath

  const blogDir = path.join(process.cwd(), "content", "blog")
  const slugPattern = new RegExp(`^slug:\\s*["']?${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?\\s*$`, "m")
  const matchingFile = fs
    .readdirSync(blogDir)
    .filter((file) => file.endsWith(".mdx"))
    .find((file) => slugPattern.test(fs.readFileSync(path.join(blogDir, file), "utf8")))

  if (!matchingFile) {
    throw new Error(`Missing content/blog file for slug ${slug}`)
  }

  return path.join(blogDir, matchingFile)
}

const slugFilters = getSlugFilters()
const slugs = TOP_VISUAL_ARTICLE_SLUGS.filter((slug) => !slugFilters || slugFilters.has(slug))

if (slugs.length === 0) {
  throw new Error(`No matching blog visual slugs found${slugFilters ? ` for ${Array.from(slugFilters).join(", ")}` : ""}.`)
}

for (const slug of slugs) {
  const filepath = resolveArticleFilepath(slug)
  const firstVisual = getArticleVisuals(slug)[0]

  if (!firstVisual?.assetPath) {
    throw new Error(`Missing first visual asset path for ${slug}`)
  }

  let raw = fs.readFileSync(filepath, "utf8")
  raw = raw.replace(/^heroImage: .*$/m, `heroImage: "${escapeYamlDoubleQuoted(firstVisual.assetPath)}"`)
  raw = raw.replace(
    /^heroImageAlt: .*$/m,
    `heroImageAlt: "${escapeYamlDoubleQuoted(`${firstVisual.title}. ${firstVisual.summary}`)}"`,
  )
  raw = removeRelatedServicesBlock(raw)

  fs.writeFileSync(filepath, raw)
  console.log(`Updated ${path.relative(process.cwd(), filepath)}`)
}
