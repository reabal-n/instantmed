#!/usr/bin/env node
/**
 * Crop the lifestyle hero photos to 16:9 so they match their display
 * container. Lighthouse's `image-aspect-ratio` audit flags any significant
 * natural-vs-displayed aspect mismatch even when `object-cover` is used.
 *
 * Crop strategies are tuned per-image via `topBias` (0.0 = north, 0.5 =
 * center, 1.0 = south).
 *
 * Run once whenever the source images change:
 *   node scripts/crop-hero-images.mjs
 */
import sharp from "sharp"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMG_DIR = path.resolve(__dirname, "..", "public", "images")

const TARGETS = [
  {
    src: "home-1.webp",
    aspect: 16 / 9,
    // Subject is mid-frame — plain center crop.
    topBias: 0.5,
  },
  {
    src: "medcert-2.webp",
    aspect: 16 / 9,
    // Man's face is upper-third, printed certificate is at the bottom.
    // Pure center cuts the certificate; pure south decapitates him.
    // 0.7 keeps his head in-frame and preserves the certificate.
    topBias: 0.7,
  },
]

async function cropOne({ src, aspect, topBias }) {
  const srcPath = path.join(IMG_DIR, src)
  const meta = await sharp(srcPath).metadata()
  if (!meta.width || !meta.height) throw new Error(`No dims on ${src}`)

  const currentRatio = meta.width / meta.height
  if (Math.abs(currentRatio - aspect) < 0.01) {
    console.log(`  skip ${src} — already ${aspect}:1`)
    return
  }

  let cropW, cropH
  if (currentRatio > aspect) {
    cropH = meta.height
    cropW = Math.round(meta.height * aspect)
  } else {
    cropW = meta.width
    cropH = Math.round(meta.width / aspect)
  }

  const left = Math.round((meta.width - cropW) / 2)
  const verticalSlack = meta.height - cropH
  const top = Math.round(verticalSlack * topBias)

  const buf = await sharp(srcPath)
    .extract({ left, top, width: cropW, height: cropH })
    .webp({ quality: 85 })
    .toBuffer()

  await sharp(buf).toFile(srcPath)
  console.log(
    `  ${src}: ${meta.width}x${meta.height} (${currentRatio.toFixed(2)}:1) -> ${cropW}x${cropH} (${aspect.toFixed(2)}:1) topBias=${topBias}`,
  )
}

console.log("Cropping hero lifestyle images to 16:9...")
for (const t of TARGETS) await cropOne(t)
console.log("Done.")
