#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

import matter from "gray-matter"

const CONTENT_DIR = path.join(process.cwd(), "content", "blog")

const SEVERITY = {
  rendering: "P0 rendering",
  cta: "P1 guide-only",
  clinical: "P1 clinical",
  image: "P2 image",
  quality: "P2 quality",
  seo: "P3 seo",
}

const CTA_PATTERNS = [
  /\/consult\b/i,
  /\/medical-certificate\b/i,
  /\/prescriptions\b/i,
  /start a consultation/i,
  /get your certificate/i,
  /request your script/i,
  /how instantmed can help/i,
]

function getFiles() {
  return fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith(".mdx")).sort()
}

function addIssue(issues, severity, message) {
  issues.push({ severity, message })
}

function auditFile(file) {
  const filePath = path.join(CONTENT_DIR, file)
  const raw = fs.readFileSync(filePath, "utf-8")
  const { data, content } = matter(raw)
  const slug = data.slug || file.replace(/\.mdx$/, "")
  const issues = []

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

  if (Array.isArray(data.relatedServices) && data.relatedServices.length > 0) {
    addIssue(issues, SEVERITY.cta, "Legacy relatedServices frontmatter is present")
  }

  if (data.category === "conditions" && !/(red flags|when to see|seek prompt|seek urgent|call 000|emergency)/i.test(content)) {
    addIssue(issues, SEVERITY.clinical, "Condition guide may be missing a visible safety boundary")
  }

  if (/^\|.*\|$/m.test(content) && !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/m.test(content)) {
    addIssue(issues, SEVERITY.rendering, "Possible malformed Markdown table")
  }

  if (/<(?!\/?Callout\b)[A-Z][A-Za-z]*(\s|>)/.test(content)) {
    addIssue(issues, SEVERITY.rendering, "Contains MDX component syntax outside supported Callout blocks")
  }

  const ctaHits = CTA_PATTERNS.filter((pattern) => pattern.test(content))
  if (ctaHits.length > 0) {
    addIssue(issues, SEVERITY.cta, "Guide body contains service/acquisition links or copy")
  }

  if (!/## /.test(content)) {
    addIssue(issues, SEVERITY.quality, "Article has no H2 structure")
  }

  if ((content.match(/## /g) || []).length < 4) {
    addIssue(issues, SEVERITY.quality, "Article may be too shallow for a comprehensive guide")
  }

  if ((content.match(/\b(AIHW|RACGP|AHPRA|Healthdirect|Services Australia|Fair Work|ASCIA|Therapeutic Guidelines|GESA|Monash|PBS|TGA)\b/g) || []).length === 0) {
    addIssue(issues, SEVERITY.quality, "No obvious Australian source or authority mention")
  }

  return {
    slug,
    file,
    category: data.category || "unknown",
    viewCount: Number(data.viewCount || 0),
    issues,
  }
}

function main() {
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
}

main()
