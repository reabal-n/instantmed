#!/usr/bin/env node
/* global console, process */

import fs from "node:fs"
import path from "node:path"

import matter from "gray-matter"

const CONTENT_DIR = path.join(process.cwd(), "content", "blog")
const BLOG_IMAGE_DIR = path.join(process.cwd(), "public", "images", "blog")
const VISUALS_FILE = path.join(process.cwd(), "lib", "blog", "visuals.ts")

const SEVERITY = {
  rendering: "P0 rendering",
  component: "P1 component",
  cta: "P1 guide-only",
  clinical: "P1 clinical",
  image: "P2 image",
  quality: "P2 quality",
  seo: "P3 seo",
}

const SEVERITY_RANK = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
}

const CTA_PATTERNS = [
  /(?<!\/blog)\/consult\b/i,
  /(?<!\/blog)\/medical-certificate\b/i,
  /(?<!\/blog)\/prescriptions\b/i,
  /start a consultation/i,
  /get your certificate/i,
  /request your script/i,
  /how instantmed can help/i,
]

const SUPPORTED_ARTICLE_COMPONENTS = new Set([
  "Callout",
  "KeyTakeaway",
  "DecisionBox",
  "EvidenceNote",
  "PolicyNote",
])

const LEARNING_AID_COMPONENTS = ["KeyTakeaway", "DecisionBox", "EvidenceNote", "PolicyNote"]
const DECISION_GROUP_TITLES = ["May fit telehealth", "Needs in-person care", "Urgent care"]

function isTableRow(line) {
  const trimmed = line.trim()
  return trimmed.startsWith("|") && trimmed.endsWith("|")
}

function isTableSeparator(line) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim())
}

function isMarkdownTableStart(lines, index) {
  return isTableRow(lines[index] || "") && isTableSeparator(lines[index + 1] || "")
}

function hasMarkdownTable(content) {
  const lines = content.split("\n")
  return lines.some((_, index) => isMarkdownTableStart(lines, index))
}

function findUnsupportedPipeTable(content) {
  const lines = content.split("\n")

  for (let index = 0; index < lines.length; index += 1) {
    if (!isTableRow(lines[index])) continue

    const tableBlock = []
    while (index < lines.length && isTableRow(lines[index])) {
      tableBlock.push(lines[index])
      index += 1
    }

    if (tableBlock.length > 0 && !isTableSeparator(tableBlock[1] || "")) {
      return true
    }
  }

  return false
}

let visualRegistrySource

function getVisualRegistrySource() {
  if (visualRegistrySource !== undefined) return visualRegistrySource
  try {
    visualRegistrySource = fs.readFileSync(VISUALS_FILE, "utf-8")
  } catch {
    visualRegistrySource = ""
  }
  return visualRegistrySource
}

function getVisualRegistryBlock(slug) {
  const source = getVisualRegistrySource()
  const quotedKey = `  "${slug}": [`
  const identifierKey = /^[A-Za-z_$][\w$]*$/.test(slug) ? `  ${slug}: [` : null
  let keyIndex = source.indexOf(quotedKey)
  if (keyIndex < 0 && identifierKey) {
    keyIndex = source.indexOf(identifierKey)
  }
  if (keyIndex < 0) return ""

  const arrayStart = source.indexOf("[", keyIndex)
  if (arrayStart < 0) return ""

  let depth = 0
  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === "[") depth += 1
    if (char === "]") depth -= 1
    if (depth === 0) return source.slice(arrayStart, index + 1)
  }

  return ""
}

function countRegisteredArticleVisuals(slug) {
  const block = getVisualRegistryBlock(slug)
  return (block.match(/\n\s*id:\s*"/g) || []).length
}

function countLocalArticleVisualAssets(slug) {
  const articleDir = path.join(BLOG_IMAGE_DIR, slug)
  try {
    return fs.readdirSync(articleDir).filter((file) => file.endsWith(".webp")).length
  } catch {
    return 0
  }
}

function getRegisteredVisualTextItems(slug) {
  return getRegisteredVisualTextItemGroups(slug).flat()
}

function getRegisteredVisualTextItemGroups(slug) {
  const block = getVisualRegistryBlock(slug)
  const groups = []
  const textItemBlocks = block.matchAll(/textItems:\s*\[([\s\S]*?)\]/g)
  for (const textItemBlock of textItemBlocks) {
    const textItems = []
    for (const item of textItemBlock[1].matchAll(/"([^"]+)"/g)) {
      textItems.push(item[1])
    }
    groups.push(textItems)
  }
  return groups
}

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function findLongVisualTextItems(slug) {
  return getRegisteredVisualTextItems(slug).filter((item) => countWords(item) > 5)
}

function hasTextHeavyVisual(slug) {
  return getRegisteredVisualTextItemGroups(slug).some((group) => {
    const totalWords = group.reduce((sum, item) => sum + countWords(item), 0)
    return group.length > 7 || totalWords > 25
  })
}

function getFiles() {
  return fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith(".mdx")).sort()
}

function addIssue(issues, severity, message) {
  issues.push({ severity, message })
}

function parseFailOnArg() {
  const arg = process.argv.find((item) => item.startsWith("--fail-on="))
  if (!arg) return null

  const value = arg.split("=")[1]?.toUpperCase()
  if (!value || value === "NONE") return null
  if (!Object.prototype.hasOwnProperty.call(SEVERITY_RANK, value)) {
    throw new Error(`Unsupported --fail-on value "${value}". Use P0, P1, P2, P3, or none.`)
  }
  return value
}

function parseFailOnImageArg() {
  return process.argv.includes("--fail-on-image")
}

function parseReportArg() {
  const arg = process.argv.find((item) => item.startsWith("--report="))
  if (!arg) return null

  const value = arg.split("=")[1]
  if (value !== "markdown" && value !== "json") {
    throw new Error(`Unsupported --report value "${value}". Use markdown or json.`)
  }
  return value
}

function issuePrefix(issue) {
  return issue.severity.split(" ")[0]
}

function isImageIssue(issue) {
  return issue.severity === SEVERITY.image
}

function findUnknownArticleComponentTags(content) {
  const unknown = new Set()
  for (const match of content.matchAll(/<\/?([A-Z][A-Za-z0-9]*)\b/g)) {
    const tagName = match[1]
    if (!SUPPORTED_ARTICLE_COMPONENTS.has(tagName)) {
      unknown.add(tagName)
    }
  }
  return [...unknown].sort()
}

function parseComponentAttributes(attributeText) {
  const attributes = {}
  for (const match of attributeText.matchAll(/\s+([A-Za-z][\w-]*)="([^"]*)"/g)) {
    attributes[match[1]] = match[2]
  }
  return attributes
}

function findClosingTagIndex(lines, startIndex, tagName) {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim() === `</${tagName}>`) return index
  }
  return -1
}

function parseBulletItems(lines, allowInline = false) {
  if (allowInline && lines.length === 1 && !lines[0].startsWith("- ")) {
    return lines[0].split(";").map((item) => item.trim()).filter(Boolean)
  }
  if (lines.length === 0 || !lines.every((item) => item.startsWith("- "))) return null
  return lines.map((item) => item.slice(2).trim()).filter(Boolean)
}

function isDecisionGroupTitle(value) {
  return DECISION_GROUP_TITLES.includes(value)
}

function parseInlineDecisionGroups(content) {
  const parts = content.split("|").map((part) => part.trim()).filter(Boolean)
  if (parts.length !== DECISION_GROUP_TITLES.length) return null

  const groups = parts.map((part) => {
    const [rawTitle, rawItems] = part.split(/:\s+/, 2)
    const title = rawTitle?.trim()
    if (!isDecisionGroupTitle(title) || !rawItems) return null
    return {
      title,
      items: rawItems.split(";").map((item) => item.trim()).filter(Boolean),
    }
  })

  if (groups.some((group) => !group || group.items.length === 0)) return null
  if (!groups.every((group, index) => group?.title === DECISION_GROUP_TITLES[index])) return null
  return groups
}

function parseDecisionGroups(lines, allowInline = false) {
  if (allowInline && lines.length === 1 && !lines[0].startsWith("### ")) {
    return parseInlineDecisionGroups(lines[0])
  }

  const groups = []
  let activeTitle = null
  let activeItems = []

  function flush() {
    if (!activeTitle) return
    groups.push({ title: activeTitle, items: activeItems })
    activeItems = []
  }

  for (const line of lines) {
    const heading = line.match(/^###\s+(.+)$/)
    if (heading) {
      flush()
      const title = heading[1].trim()
      if (!isDecisionGroupTitle(title)) return null
      activeTitle = title
      continue
    }

    if (!activeTitle || !line.startsWith("- ")) return null
    activeItems.push(line.slice(2).trim())
  }

  flush()

  if (groups.length !== DECISION_GROUP_TITLES.length) return null
  if (groups.some((group) => group.items.length === 0)) return null
  if (!groups.every((group, index) => group.title === DECISION_GROUP_TITLES[index])) return null
  return groups
}

function isLearningAidBlockValid(tagName, attributes, bodyLines, allowInline = false) {
  const body = bodyLines.map((line) => line.trim()).filter(Boolean)
  if (!attributes.title) return false
  if (tagName === "KeyTakeaway") return Boolean(parseBulletItems(body, allowInline)?.length)
  if (tagName === "DecisionBox") return parseDecisionGroups(body, allowInline) !== null
  if (tagName === "EvidenceNote" || tagName === "PolicyNote") return body.length > 0
  return false
}

function findMalformedArticleComponentBlocks(content) {
  const issues = []
  const lines = content.split("\n")

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim()
    const inline = trimmed.match(/^<(KeyTakeaway|DecisionBox|EvidenceNote|PolicyNote)\b([^>]*)>(.*?)<\/\1>\s*$/)
    if (inline) {
      if (!isLearningAidBlockValid(inline[1], parseComponentAttributes(inline[2]), [inline[3]], true)) {
        issues.push(`${inline[1]} inline block malformed near line ${index + 1}`)
      }
      continue
    }

    const opening = trimmed.match(/^<(KeyTakeaway|DecisionBox|EvidenceNote|PolicyNote)\b([^>]*)>\s*$/)
    if (!opening) continue

    const closingIndex = findClosingTagIndex(lines, index + 1, opening[1])
    if (closingIndex < 0) {
      issues.push(`${opening[1]} block missing closing tag near line ${index + 1}`)
      continue
    }

    if (!isLearningAidBlockValid(opening[1], parseComponentAttributes(opening[2]), lines.slice(index + 1, closingIndex), false)) {
      issues.push(`${opening[1]} block malformed near line ${index + 1}`)
    }
    index = closingIndex
  }

  return issues
}

function countSourceItems(content) {
  const lines = content.split("\n")
  const start = lines.findIndex((line) => /^##\s+(Sources|References|Further reading)\b/i.test(line.trim()))
  if (start < 0) return 0
  let count = 0
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (line.startsWith("## ")) break
    if (line.startsWith("- ") || /^\d+\.\s+/.test(line)) count += 1
  }
  return count
}

function hasComponent(content, componentName) {
  return new RegExp(`<${componentName}\\b`).test(content)
}

function firstThirdHasLearningAid(content) {
  const lines = content.split("\n").filter((line) => line.trim() !== "")
  const firstThird = lines.slice(0, Math.max(1, Math.ceil(lines.length / 3))).join("\n")
  return LEARNING_AID_COMPONENTS.some((component) => hasComponent(firstThird, component)) || hasMarkdownTable(firstThird)
}

function getEffectiveHeroImageFit(data) {
  if (data.heroImageFit === "cover" || data.heroImageFit === "contain") return data.heroImageFit
  return String(data.heroImage || "").startsWith("/images/blog/") ? "contain" : "cover"
}

function getReviewerStatus(slug) {
  try {
    const source = fs.readFileSync(path.join(process.cwd(), "lib", "blog", "medical-reviewer.ts"), "utf-8")
    const slugs = [...source.matchAll(/"([^"]+)"/g)].map((match) => match[1])
    return slugs.includes(slug) ? "person" : "team"
  } catch {
    return "unknown"
  }
}

function auditFile(file) {
  const filePath = path.join(CONTENT_DIR, file)
  const raw = fs.readFileSync(filePath, "utf-8")
  const { data, content } = matter(raw)
  const slug = data.slug || file.replace(/\.mdx$/, "")
  const issues = []
  const h2Count = (content.match(/## /g) || []).length
  const wordCount = content.split(/\s+/).filter(Boolean).length
  const hasSourcesSection = /##\s+(Sources|References|Further reading)\b/i.test(content)
  const registeredVisuals = countRegisteredArticleVisuals(slug)
  const localVisualAssets = countLocalArticleVisualAssets(slug)
  const unknownComponents = findUnknownArticleComponentTags(content)
  const malformedComponents = findMalformedArticleComponentBlocks(content)
  const ctaHits = CTA_PATTERNS.filter((pattern) => pattern.test(content))

  if (!data.title || data.title.length < 20) {
    addIssue(issues, SEVERITY.seo, "Title is missing or too thin")
  }

  if (!data.excerpt || data.excerpt.length < 80) {
    addIssue(issues, SEVERITY.seo, "Excerpt is missing or too thin")
  }

  if (!data.heroImageAlt || data.heroImageAlt.length < 30) {
    addIssue(issues, SEVERITY.image, "Hero alt text is missing or too vague")
  }

  if (/images\.unsplash\.com/i.test(String(data.heroImage || ""))) {
    addIssue(issues, SEVERITY.image, "Hero still uses Unsplash")
  }

  if (registeredVisuals < 2 || localVisualAssets < 2) {
    addIssue(
      issues,
      SEVERITY.image,
      `Article has fewer than two registered local GPT-generated visuals (${registeredVisuals} registered, ${localVisualAssets} local assets)`,
    )
  }

  if (Array.isArray(data.relatedServices) && data.relatedServices.length > 0) {
    addIssue(issues, SEVERITY.cta, "Legacy relatedServices frontmatter is present")
  }

  if (data.category === "conditions" && !/(red flags|when to see|seek prompt|seek urgent|call 000|emergency)/i.test(content)) {
    addIssue(issues, SEVERITY.clinical, "Condition guide may be missing a visible safety boundary")
  }

  if (findUnsupportedPipeTable(content)) {
    addIssue(issues, SEVERITY.rendering, "Pipe-table syntax is missing a valid Markdown header separator")
  }

  if (unknownComponents.length > 0) {
    addIssue(issues, SEVERITY.component, `Contains unsupported article component tags: ${unknownComponents.join(", ")}`)
  }

  if (malformedComponents.length > 0) {
    addIssue(issues, SEVERITY.component, `Contains malformed article component blocks: ${malformedComponents.join("; ")}`)
  }

  if (ctaHits.length > 0) {
    addIssue(issues, SEVERITY.cta, "Guide body contains service/acquisition links or copy")
  }

  if (!/## /.test(content)) {
    addIssue(issues, SEVERITY.quality, "Article has no H2 structure")
  }

  if (h2Count < 6) {
    addIssue(issues, SEVERITY.quality, "Article has fewer than six H2 sections")
  }

  if (wordCount < 1200) {
    addIssue(issues, SEVERITY.quality, `Article is likely too shallow for a comprehensive guide (${wordCount} words)`)
  }

  if (!hasSourcesSection) {
    addIssue(issues, SEVERITY.quality, "Article is missing a visible sources or references section")
  }

  if ((content.match(/\b(AIHW|RACGP|AHPRA|Healthdirect|Services Australia|Fair Work|ASCIA|Therapeutic Guidelines|GESA|Monash|PBS|TGA)\b/g) || []).length === 0) {
    addIssue(issues, SEVERITY.quality, "No obvious Australian source or authority mention")
  }

  const longVisualTextItems = findLongVisualTextItems(slug)
  if (longVisualTextItems.length > 0) {
    addIssue(
      issues,
      SEVERITY.image,
      `Generated visual registry textItems exceed the 1-5 word label cap: ${longVisualTextItems.slice(0, 4).join(", ")}`,
    )
  }

  if (hasTextHeavyVisual(slug)) {
    addIssue(issues, SEVERITY.image, "Generated visual registry is text-heavy; move the explanation into HTML components first")
  }

  return {
    slug,
    file,
    category: data.category || "unknown",
    viewCount: Number(data.viewCount || 0),
    wordCount,
    h2Count,
    registeredVisuals,
    localVisualAssets,
    heroImageFit: getEffectiveHeroImageFit(data),
    hasSourcesSection,
    sourceItemCount: countSourceItems(content),
    reviewerStatus: getReviewerStatus(slug),
    hasSemanticTable: hasMarkdownTable(content),
    hasKeyTakeaway: hasComponent(content, "KeyTakeaway"),
    hasDecisionBox: hasComponent(content, "DecisionBox"),
    hasEvidenceNote: hasComponent(content, "EvidenceNote"),
    hasPolicyNote: hasComponent(content, "PolicyNote"),
    firstThirdHasLearningAid: firstThirdHasLearningAid(content),
    unknownComponents,
    malformedComponents,
    ctaHitCount: ctaHits.length,
    issues,
  }
}

function reportRows(rows) {
  return rows.map((row) => ({
    slug: row.slug,
    category: row.category,
    wordCount: row.wordCount,
    h2Count: row.h2Count,
    registeredVisuals: row.registeredVisuals,
    localVisualAssets: row.localVisualAssets,
    heroImageFit: row.heroImageFit,
    hasSourcesSection: row.hasSourcesSection,
    sourceItemCount: row.sourceItemCount,
    reviewerStatus: row.reviewerStatus,
    hasSemanticTable: row.hasSemanticTable,
    hasKeyTakeaway: row.hasKeyTakeaway,
    hasDecisionBox: row.hasDecisionBox,
    hasEvidenceNote: row.hasEvidenceNote,
    hasPolicyNote: row.hasPolicyNote,
    firstThirdHasLearningAid: row.firstThirdHasLearningAid,
    unknownComponents: row.unknownComponents,
    malformedComponents: row.malformedComponents,
    ctaHitCount: row.ctaHitCount,
    issueCount: row.issues.length,
  }))
}

function renderMarkdownReport(rows) {
  const columns = [
    "slug",
    "words",
    "h2",
    "visuals",
    "heroFit",
    "sources",
    "reviewer",
    "table",
    "takeaway",
    "decision",
    "evidence",
    "policy",
    "firstThirdAid",
    "ctaHits",
    "issues",
  ]
  console.log(`\n| ${columns.join(" | ")} |`)
  console.log(`| ${columns.map(() => "---").join(" | ")} |`)
  for (const row of rows) {
    console.log(
      `| ${[
        row.slug,
        row.wordCount,
        row.h2Count,
        `${row.registeredVisuals}/${row.localVisualAssets}`,
        row.heroImageFit,
        row.hasSourcesSection ? row.sourceItemCount : "no",
        row.reviewerStatus,
        row.hasSemanticTable ? "yes" : "no",
        row.hasKeyTakeaway ? "yes" : "no",
        row.hasDecisionBox ? "yes" : "no",
        row.hasEvidenceNote ? "yes" : "no",
        row.hasPolicyNote ? "yes" : "no",
        row.firstThirdHasLearningAid ? "yes" : "no",
        row.ctaHitCount,
        row.issues.length,
      ].join(" | ")} |`,
    )
  }
}

function main() {
  const failOn = parseFailOnArg()
  const failOnImage = parseFailOnImageArg()
  const report = parseReportArg()
  const rows = getFiles().map(auditFile)
  const rowsWithIssues = rows.filter((row) => row.issues.length > 0)
  const issueCounts = rowsWithIssues.reduce((counts, row) => {
    for (const issue of row.issues) {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1
    }
    return counts
  }, {})

  console.log(`Audited ${rows.length} health guide articles.`)
  console.log(`Articles with issues: ${rowsWithIssues.length}`)
  for (const [severity, count] of Object.entries(issueCounts)) {
    console.log(`${severity}: ${count}`)
  }

  console.log("\nTop issue backlog:")
  for (const row of rowsWithIssues.sort((a, b) => b.viewCount - a.viewCount).slice(0, 30)) {
    console.log(`\n${row.viewCount.toString().padStart(6)}  ${row.slug}  (${row.category})`)
    for (const issue of row.issues) {
      console.log(`  - ${issue.severity}: ${issue.message}`)
    }
  }

  if (report === "json") {
    console.log(JSON.stringify(reportRows(rows), null, 2))
  } else if (report === "markdown") {
    renderMarkdownReport(rows)
  }

  const blockingRows = failOn
    ? rowsWithIssues.filter((row) =>
      row.issues.some((issue) =>
        SEVERITY_RANK[issuePrefix(issue)] <= SEVERITY_RANK[failOn],
      ),
    )
    : []

  if (blockingRows.length > 0) {
    console.log(`\nBlocking content failures at ${failOn} or higher:`)
    for (const row of blockingRows.sort((a, b) => b.viewCount - a.viewCount).slice(0, 20)) {
      console.log(`\n${row.viewCount.toString().padStart(6)}  ${row.slug}  (${row.category})`)
      for (const issue of row.issues.filter((item) =>
        SEVERITY_RANK[issuePrefix(item)] <= SEVERITY_RANK[failOn],
      )) {
        console.log(`  - ${issue.severity}: ${issue.message}`)
      }
    }
    process.exitCode = 1
  }

  const imageBlockingRows = failOnImage
    ? rowsWithIssues.filter((row) => row.issues.some(isImageIssue))
    : []

  if (imageBlockingRows.length > 0) {
    console.log("\nBlocking image failures:")
    for (const row of imageBlockingRows.sort((a, b) => b.viewCount - a.viewCount).slice(0, 20)) {
      console.log(`\n${row.viewCount.toString().padStart(6)}  ${row.slug}  (${row.category})`)
      for (const issue of row.issues.filter(isImageIssue)) {
        console.log(`  - ${issue.severity}: ${issue.message}`)
      }
    }
    process.exitCode = 1
  }
}

main()
