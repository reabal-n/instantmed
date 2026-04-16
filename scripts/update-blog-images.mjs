/**
 * Blog image pipeline: convert stock photos to webp + update all MDX frontmatter.
 *
 * Usage:
 *   1. Drop your 5 stock photos into scripts/blog-photos/ named by category:
 *        telehealth.jpg         (35 articles)
 *        medical-certificates.jpg  (23 articles)
 *        medications.jpg        (21 articles)
 *        workplace-health.jpg   (12 articles)
 *        conditions.jpg         (11 articles)
 *      Any format works: jpg, jpeg, png, webp
 *
 *   2. Run:  node scripts/update-blog-images.mjs
 *      Or:   pnpm blog:images
 *
 * What it does:
 *   - Converts each photo to webp at 1200x675 (16:9), quality 85
 *   - Saves to public/images/blog/<category>.webp
 *   - Rewrites heroImage + heroImageAlt in every MDX frontmatter
 *
 * Requires: cwebp (brew install webp) or ffmpeg (brew install ffmpeg)
 */

import { execSync } from "child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"
import { basename, extname, join } from "path"
import { fileURLToPath } from "url"

const __dir = fileURLToPath(new URL(".", import.meta.url))
const ROOT = join(__dir, "..")
const PHOTOS_DIR = join(__dir, "blog-photos")
const OUTPUT_DIR = join(ROOT, "public", "images", "blog")
const CONTENT_DIR = join(ROOT, "content", "blog")

const CATEGORY_ALT = {
  "telehealth": "Online doctor consultation in Australia",
  "medical-certificates": "Medical certificate for work or uni",
  "medications": "Prescription medications at an Australian pharmacy",
  "workplace-health": "Workplace health and sick leave in Australia",
  "conditions": "Doctor reviewing patient health conditions",
}

const SUPPORTED_EXT = [".jpg", ".jpeg", ".png", ".webp"]

function convertToWebp(inputPath, outputPath) {
  const ext = extname(inputPath).toLowerCase()
  if (!SUPPORTED_EXT.includes(ext)) {
    console.warn(`  Skipping unsupported format: ${inputPath}`)
    return false
  }
  try {
    // Try cwebp first (best quality)
    if (ext !== ".webp") {
      execSync(`cwebp -q 85 -resize 1200 0 "${inputPath}" -o "${outputPath}"`, { stdio: "pipe" })
    } else {
      // Already webp - just copy (cwebp can't re-encode webp input)
      execSync(`ffmpeg -y -i "${inputPath}" -vf "scale=1200:-1" -quality 85 "${outputPath}"`, { stdio: "pipe" })
    }
    return true
  } catch {
    try {
      // Fallback to ffmpeg
      execSync(`ffmpeg -y -i "${inputPath}" -vf "scale=1200:675:force_original_aspect_ratio=decrease,pad=1200:675:(ow-iw)/2:(oh-ih)/2" "${outputPath}"`, { stdio: "pipe" })
      return true
    } catch (e) {
      console.error(`  Failed to convert ${inputPath}:`, e.message)
      return false
    }
  }
}

function updateMdxFile(filePath, category) {
  const imagePath = `/images/blog/${category}.webp`
  const altText = CATEGORY_ALT[category] || "Medical consultation in Australia"
  let content = readFileSync(filePath, "utf-8")
  // Replace heroImage line
  content = content.replace(/^heroImage:.*$/m, `heroImage: "${imagePath}"`)
  // Replace heroImageAlt line
  content = content.replace(/^heroImageAlt:.*$/m, `heroImageAlt: "${altText}"`)
  writeFileSync(filePath, content, "utf-8")
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (!existsSync(PHOTOS_DIR)) {
  mkdirSync(PHOTOS_DIR, { recursive: true })
  console.log(`Created ${PHOTOS_DIR}`)
  console.log("Drop your 5 category photos there and re-run.")
  process.exit(0)
}

mkdirSync(OUTPUT_DIR, { recursive: true })

// 1. Convert photos
const photoFiles = readdirSync(PHOTOS_DIR).filter(f => SUPPORTED_EXT.includes(extname(f).toLowerCase()))
if (photoFiles.length === 0) {
  console.log(`No photos found in ${PHOTOS_DIR}`)
  console.log("Add: telehealth.jpg, medical-certificates.jpg, medications.jpg, workplace-health.jpg, conditions.jpg")
  process.exit(0)
}

const converted = new Set()
for (const file of photoFiles) {
  const category = basename(file, extname(file))
  if (!CATEGORY_ALT[category]) {
    console.warn(`  Unknown category "${category}" - skipping. Valid names: ${Object.keys(CATEGORY_ALT).join(", ")}`)
    continue
  }
  const inputPath = join(PHOTOS_DIR, file)
  const outputPath = join(OUTPUT_DIR, `${category}.webp`)
  process.stdout.write(`  Converting ${file} → public/images/blog/${category}.webp ... `)
  if (convertToWebp(inputPath, outputPath)) {
    converted.add(category)
    console.log("done")
  }
}

if (converted.size === 0) {
  console.error("No photos converted. Check errors above.")
  process.exit(1)
}

// 2. Update MDX files
const mdxFiles = readdirSync(CONTENT_DIR).filter(f => f.endsWith(".mdx"))
let updated = 0
let skipped = 0
for (const file of mdxFiles) {
  const filePath = join(CONTENT_DIR, file)
  const content = readFileSync(filePath, "utf-8")
  // Extract category from frontmatter
  const match = content.match(/^category:\s*(\S+)/m)
  if (!match) { skipped++; continue }
  const category = match[1]
  if (!converted.has(category)) { skipped++; continue }
  updateMdxFile(filePath, category)
  updated++
}

console.log(`\nDone: converted ${converted.size} images, updated ${updated} MDX files (${skipped} skipped - no matching image).`)
console.log("Commit public/images/blog/*.webp and the updated content/blog/*.mdx files.")
