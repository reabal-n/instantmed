import fs from "node:fs"
import path from "node:path"

import { getArticleVisuals, TOP_VISUAL_ARTICLE_SLUGS } from "@/lib/blog/visuals"

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

for (const slug of TOP_VISUAL_ARTICLE_SLUGS) {
  const filepath = path.join(process.cwd(), "content", "blog", `${slug}.mdx`)
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
