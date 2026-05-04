/* eslint-disable no-console */

import fs from "node:fs/promises"
import path from "node:path"

import sharp from "sharp"

import type { ArticleVisual, ArticleVisualItem } from "@/lib/blog/visuals"
import { getAllTopArticleVisuals, TOP_VISUAL_ARTICLE_SLUGS } from "@/lib/blog/visuals"

interface Palette {
  dark: string
  mid: string
  light: string
  wash: string
  text: string
}

const WIDTH = 1280
const HEIGHT = 1600

const palettes: Record<ArticleVisual["accent"], Palette> = {
  amber: {
    dark: "#a16207",
    mid: "#f2b94b",
    light: "#fff3d4",
    wash: "#fff9eb",
    text: "#1e293b",
  },
  blue: {
    dark: "#173b73",
    mid: "#4b83d1",
    light: "#e8f1ff",
    wash: "#f7fbff",
    text: "#172033",
  },
  emerald: {
    dark: "#087457",
    mid: "#39b68f",
    light: "#e4f8f1",
    wash: "#f6fffb",
    text: "#172033",
  },
  rose: {
    dark: "#be3455",
    mid: "#f06f8e",
    light: "#ffe7ee",
    wash: "#fff8fa",
    text: "#172033",
  },
  sky: {
    dark: "#036992",
    mid: "#50b4de",
    light: "#e5f7ff",
    wash: "#f6fcff",
    text: "#172033",
  },
}

const tonePalette: Record<NonNullable<ArticleVisualItem["tone"]>, { bg: string; fg: string }> = {
  caution: { bg: "#fff3d4", fg: "#a16207" },
  neutral: { bg: "#eef2f7", fg: "#475569" },
  safe: { bg: "#dcfce7", fg: "#166534" },
  urgent: { bg: "#ffe4e6", fg: "#be123c" },
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
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:]$/, "")}...`
  }

  const svg = lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(line)}</text>`,
    )
    .join("")

  return {
    svg,
    height: lines.length * lineHeight,
  }
}

function pill(x: number, y: number, width: number, height: number, fill: string, opacity = 1) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${fill}" opacity="${opacity}"/>`
}

function card(x: number, y: number, width: number, height: number, fill = "#ffffff", stroke = "#e2e8f0") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
}

function badge(x: number, y: number, text: string, palette: Palette) {
  return `
    ${pill(x, y, 216, 44, palette.light)}
    <text x="${x + 24}" y="${y + 29}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="${palette.dark}" letter-spacing="1.4">${escapeXml(text.toUpperCase())}</text>
  `
}

function guideIcon(kind: ArticleVisual["kind"], x: number, y: number, palette: Palette) {
  if (kind === "warning") {
    return `
      <path d="M${x + 48} ${y + 6} L${x + 92} ${y + 86} Q${x + 96} ${y + 94} ${x + 86} ${y + 94} H${x + 10} Q${x} ${y + 94} ${x + 5} ${y + 86} L${x + 49} ${y + 6} Z" fill="${palette.mid}"/>
      <text x="${x + 43}" y="${y + 64}" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="900" fill="#ffffff">!</text>
    `
  }

  if (kind === "timeline") {
    return `
      <circle cx="${x + 24}" cy="${y + 24}" r="18" fill="${palette.mid}"/>
      <circle cx="${x + 74}" cy="${y + 74}" r="18" fill="${palette.dark}"/>
      <path d="M${x + 24} ${y + 24} C${x + 42} ${y + 52}, ${x + 54} ${y + 46}, ${x + 74} ${y + 74}" fill="none" stroke="${palette.mid}" stroke-width="10" stroke-linecap="round"/>
    `
  }

  if (kind === "flow") {
    return `
      <rect x="${x}" y="${y + 12}" width="48" height="48" rx="14" fill="${palette.light}"/>
      <rect x="${x + 74}" y="${y + 12}" width="48" height="48" rx="14" fill="${palette.light}"/>
      <path d="M${x + 50} ${y + 36} H${x + 70}" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round"/>
      <path d="M${x + 68} ${y + 25} L${x + 82} ${y + 36} L${x + 68} ${y + 47}" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    `
  }

  return `
    <circle cx="${x + 42}" cy="${y + 42}" r="42" fill="${palette.light}"/>
    <path d="M${x + 22} ${y + 43} L${x + 38} ${y + 59} L${x + 66} ${y + 26}" fill="none" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  `
}

function renderItemCard(item: ArticleVisualItem, index: number, x: number, y: number, width: number, height: number, palette: Palette) {
  const tone = tonePalette[item.tone ?? "neutral"]
  const label = textBlock({
    text: item.label,
    x: x + 104,
    y: y + 58,
    width: width - 136,
    size: 30,
    weight: 850,
    color: palette.text,
    maxLines: 3,
  })
  const detail = textBlock({
    text: item.detail,
    x: x + 104,
    y: y + 58 + label.height + 16,
    width: width - 136,
    size: 24,
    weight: 500,
    color: "#475569",
    lineHeight: 34,
    maxLines: 5,
  })

  return `
    ${card(x, y, width, height)}
    <circle cx="${x + 52}" cy="${y + 58}" r="30" fill="${tone.bg}"/>
    <text x="${x + 43}" y="${y + 68}" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="900" fill="${tone.fg}">${index + 1}</text>
    ${label.svg}
    ${detail.svg}
  `
}

function renderFlowMap(visual: ArticleVisual, palette: Palette) {
  const nodes = visual.items.slice(0, 4)
  return nodes
    .map((item, index) => {
      const y = 590 + index * 172
      return `
        ${renderItemCard(item, index, 120, y, 1040, 154, palette)}
        ${
          index < nodes.length - 1
            ? `<path d="M640 ${y + 156} V${y + 168}" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round"/><path d="M626 ${y + 158} L640 ${y + 174} L654 ${y + 158}" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
            : ""
        }
      `
    })
    .join("")
}

function renderChecklistMap(visual: ArticleVisual, palette: Palette) {
  return visual.items
    .slice(0, 4)
    .map((item, index) => renderItemCard(item, index, 120, 590 + index * 172, 1040, 154, palette))
    .join("")
}

function renderComparisonMap(visual: ArticleVisual, palette: Palette) {
  const items = visual.items.slice(0, 4)
  return items
    .map((item, index) => {
      const y = 590 + index * 172
      return renderItemCard(item, index, 120, y, 1040, 154, palette)
    })
    .join("")
}

function renderWarningMap(visual: ArticleVisual, palette: Palette) {
  const [first, ...rest] = visual.items
  const primary = first ? renderItemCard(first, 0, 120, 620, 1040, 180, palette) : ""
  const secondary = rest
    .slice(0, 3)
    .map((item, index) => renderItemCard(item, index + 1, 120, 820 + index * 174, 1040, 156, palette))
    .join("")

  return `
    <rect x="120" y="550" width="1040" height="44" rx="22" fill="${palette.light}"/>
    <path d="M166 561 L186 583 L224 543" fill="none" stroke="${palette.dark}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="252" y="580" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="850" fill="${palette.dark}">Safety boundary</text>
    ${primary}
    ${secondary}
  `
}

function renderSpectrumMap(visual: ArticleVisual, palette: Palette) {
  const items = visual.items.slice(0, 4)
  const segmentWidth = Math.floor(1040 / items.length)
  const y = 548
  const bar = items
    .map((item, index) => {
      const x = 120 + index * segmentWidth
      const label = textBlock({
        text: item.label,
        x: x + 28,
        y: y + 118,
        width: segmentWidth - 56,
        size: 25,
        weight: 850,
        color: palette.text,
        maxLines: 2,
      })
      const detail = textBlock({
        text: item.detail,
        x: x + 28,
        y: y + 118 + label.height + 12,
        width: segmentWidth - 56,
        size: 21,
        color: "#475569",
        lineHeight: 29,
        maxLines: 3,
      })

      return `
        <rect x="${x}" y="${y}" width="${segmentWidth}" height="310" fill="${index % 2 === 0 ? palette.light : "#ffffff"}" stroke="${palette.mid}" stroke-width="2"/>
        <circle cx="${x + 52}" cy="${y + 52}" r="26" fill="${palette.dark}" opacity="${0.65 + index * 0.1}"/>
        ${label.svg}
        ${detail.svg}
      `
    })
    .join("")

  return `<g clip-path="url(#spectrumClip)">${bar}</g><rect x="120" y="${y}" width="1040" height="310" rx="28" fill="none" stroke="${palette.mid}" stroke-width="2"/>`
}

function renderMap(visual: ArticleVisual, palette: Palette) {
  switch (visual.kind) {
    case "comparison":
      return renderComparisonMap(visual, palette)
    case "flow":
    case "timeline":
      return renderFlowMap(visual, palette)
    case "warning":
      return renderWarningMap(visual, palette)
    case "checklist":
      return renderChecklistMap(visual, palette)
    case "spectrum":
      return renderSpectrumMap(visual, palette)
  }
}

function renderArticleVisualSvg(slug: string, visual: ArticleVisual): string {
  const palette = palettes[visual.accent]
  const title = textBlock({
    text: visual.title,
    x: 80,
    y: 178,
    width: 800,
    size: 52,
    weight: 900,
    color: palette.dark,
    lineHeight: 62,
    maxLines: 4,
  })
  const summary = textBlock({
    text: visual.summary,
    x: 84,
    y: 178 + title.height + 34,
    width: 820,
    size: 28,
    weight: 500,
    color: "#334155",
    lineHeight: 40,
    maxLines: 3,
  })
  const footer = textBlock({
    text: "Educational guide. Use urgent care for emergency symptoms.",
    x: 190,
    y: 1506,
    width: 820,
    size: 23,
    weight: 600,
    color: "#ffffff",
    maxLines: 1,
  })

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <clipPath id="spectrumClip">
          <rect x="120" y="548" width="1040" height="310" rx="28"/>
        </clipPath>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.10"/>
        </filter>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.wash}"/>
      <circle cx="1024" cy="170" r="170" fill="${palette.light}"/>
      <circle cx="1122" cy="1290" r="220" fill="${palette.light}" opacity="0.72"/>
      ${badge(80, 72, visual.eyebrow, palette)}
      ${guideIcon(visual.kind, 1010, 92, palette)}
      ${title.svg}
      ${summary.svg}
      <g filter="url(#softShadow)">
        ${renderMap(visual, palette)}
      </g>
      <rect x="80" y="1418" width="1120" height="116" rx="34" fill="${palette.dark}"/>
      <circle cx="132" cy="1476" r="28" fill="#ffffff" opacity="0.18"/>
      <path d="M118 1477 L130 1489 L150 1462" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      ${footer.svg}
    </svg>
  `
}

async function saveInfographic(slug: string, visual: ArticleVisual) {
  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visual.id}.webp`)
  const svg = renderArticleVisualSvg(slug, visual)
  await sharp(Buffer.from(svg)).webp({ quality: 88, effort: 5 }).toFile(filepath)
  return filepath
}

async function main() {
  const slugFilter = getArg("slug")
  const limit = Number(getArg("limit") ?? "0")
  const dryRun = hasFlag("dry-run")
  const force = hasFlag("force")

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

    if (dryRun) {
      console.log(`\n--- ${slug}/${visual.id} ---\n${renderArticleVisualSvg(slug, visual)}`)
      continue
    }

    console.log(`Generating infographic ${slug}/${visual.id}...`)
    const saved = await saveInfographic(slug, visual)
    console.log(`Saved ${path.relative(process.cwd(), saved)}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
