/* eslint-disable no-console */

import fs from "node:fs/promises"
import path from "node:path"

import { gateway, generateImage } from "ai"
import dotenv from "dotenv"
import sharp from "sharp"

import type { ArticleVisual, ArticleVisualItem } from "@/lib/blog/visuals"
import { getAllTopArticleVisuals, TOP_VISUAL_ARTICLE_SLUGS } from "@/lib/blog/visuals"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })

interface Palette {
  dark: string
  mid: string
  light: string
  wash: string
  text: string
}

const WIDTH = 1280
const HEIGHT = 1600
const GPT_IMAGE_MODEL = "openai/gpt-image-2"
const DEFAULT_GATEWAY_SIZE = "1024x1536"
const supportedGatewaySizes = ["1024x1024", "1024x1536", "1536x1024"] as const
type GatewayImageSize = (typeof supportedGatewaySizes)[number]
const BRAND_BADGE_WIDTH = 248
const BRAND_BADGE_HEIGHT = 50
const BRAND_BADGE_MARGIN = 24
const BRAND_LOGO_SIZE = 30
const BRAND_WORDMARK_WIDTH = 152
const BRAND_WORDMARK_HEIGHT = 24
const BRAND_LOGO_PATH = path.join(process.cwd(), "public", "branding", "logo.png")
const BRAND_WORDMARK_PATH = path.join(process.cwd(), "public", "branding", "wordmark.png")
const SVG_FONT_FAMILY = "Arial, Helvetica, sans-serif"

type Renderer = "deterministic" | "gpt-image-2" | "gpt-image-2-composite"
type VisualFormat = NonNullable<ArticleVisual["visualFormat"]>

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

function getRenderer(): Renderer {
  const renderer = getArg("renderer")
  if (!renderer) return hasFlag("gateway") ? "gpt-image-2" : "deterministic"
  if (renderer === "deterministic" || renderer === "gpt-image-2" || renderer === "gpt-image-2-composite") {
    return renderer
  }
  throw new Error(`Unsupported renderer "${renderer}". Use deterministic, gpt-image-2, or gpt-image-2-composite.`)
}

function getGatewayImageSize(): GatewayImageSize {
  const size = getArg("size")
  if (!size) return DEFAULT_GATEWAY_SIZE
  if (supportedGatewaySizes.includes(size as GatewayImageSize)) return size as GatewayImageSize
  throw new Error(`Unsupported --size "${size}". Use ${supportedGatewaySizes.join(", ")}.`)
}

function configureGatewayAuth() {
  process.env.AI_GATEWAY_API_KEY ||= process.env.VERCEL_AI_GATEWAY_API_KEY
}

function assertGatewayAuth() {
  configureGatewayAuth()
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error(
      "Missing AI Gateway auth. Run `vercel env pull .env.local --yes` or set AI_GATEWAY_API_KEY.",
    )
  }
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
        `<text x="${x}" y="${y + index * lineHeight}" font-family="${SVG_FONT_FAMILY}" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(line)}</text>`,
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
    <text x="${x + 24}" y="${y + 29}" font-family="${SVG_FONT_FAMILY}" font-size="20" font-weight="800" fill="${palette.dark}" letter-spacing="1.4">${escapeXml(text.toUpperCase())}</text>
  `
}

function renderBackgroundTexture(palette: Palette) {
  return `
    <path d="M-80 455 C210 370 405 460 650 382 C890 306 1045 350 1360 242" fill="none" stroke="${palette.mid}" stroke-width="3" opacity="0.18"/>
    <path d="M-40 1248 C196 1120 420 1212 650 1110 C886 1006 1060 1038 1350 934" fill="none" stroke="${palette.mid}" stroke-width="3" opacity="0.14"/>
    <g opacity="0.13">
      <circle cx="121" cy="438" r="5" fill="${palette.dark}"/>
      <circle cx="294" cy="402" r="5" fill="${palette.dark}"/>
      <circle cx="486" cy="428" r="5" fill="${palette.dark}"/>
      <circle cx="738" cy="356" r="5" fill="${palette.dark}"/>
      <circle cx="1010" cy="332" r="5" fill="${palette.dark}"/>
    </g>
    <rect x="922" y="1058" width="326" height="326" rx="72" fill="${palette.light}" opacity="0.34" transform="rotate(-11 1085 1221)"/>
  `
}

function renderVisualMotif(visual: ArticleVisual, palette: Palette) {
  if (visual.id.includes("safety-net")) {
    return `
      <g transform="translate(905 86)">
        <rect x="0" y="0" width="278" height="238" rx="34" fill="#ffffff" opacity="0.88" stroke="${palette.light}" stroke-width="2"/>
        <rect x="28" y="34" width="222" height="154" rx="20" fill="${palette.light}" opacity="0.78"/>
        <path d="M60 74 H220 M60 108 H220 M60 142 H220" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.78"/>
        <path d="M96 48 V170 M150 48 V170 M204 48 V170" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.78"/>
        <path d="M54 180 C96 118 135 148 164 104 C190 66 210 82 236 50" fill="none" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round"/>
        <circle cx="54" cy="180" r="13" fill="${palette.dark}"/>
        <circle cx="164" cy="104" r="13" fill="${palette.dark}"/>
        <circle cx="236" cy="50" r="13" fill="${palette.dark}"/>
      </g>
    `
  }

  if (visual.id.includes("authority")) {
    return `
      <g transform="translate(908 88)">
        <rect x="0" y="0" width="280" height="240" rx="34" fill="#ffffff" opacity="0.88" stroke="${palette.light}" stroke-width="2"/>
        <path d="M58 120 H128 C160 120 162 66 212 66" fill="none" stroke="${palette.mid}" stroke-width="12" stroke-linecap="round"/>
        <path d="M128 120 C162 120 164 174 214 174" fill="none" stroke="${palette.mid}" stroke-width="12" stroke-linecap="round"/>
        <circle cx="58" cy="120" r="24" fill="${palette.dark}"/>
        <circle cx="214" cy="66" r="22" fill="${palette.light}" stroke="${palette.dark}" stroke-width="5"/>
        <circle cx="214" cy="174" r="22" fill="${palette.light}" stroke="${palette.dark}" stroke-width="5"/>
        <rect x="78" y="36" width="52" height="30" rx="15" fill="${palette.light}"/>
        <rect x="84" y="174" width="68" height="30" rx="15" fill="${palette.light}"/>
        <path d="M42 198 L70 214 L112 184" fill="none" stroke="${palette.dark}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    `
  }

  return `
    <g transform="translate(904 86)">
      <rect x="0" y="0" width="282" height="240" rx="34" fill="#ffffff" opacity="0.88" stroke="${palette.light}" stroke-width="2"/>
      <rect x="38" y="42" width="72" height="118" rx="22" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
      <rect x="54" y="22" width="40" height="30" rx="10" fill="${palette.dark}" opacity="0.92"/>
      <path d="M126 92 H222" stroke="${palette.mid}" stroke-width="12" stroke-linecap="round"/>
      <path d="M206 70 L232 92 L206 114" fill="none" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="128" cy="162" r="15" fill="${palette.dark}"/>
      <circle cx="174" cy="162" r="15" fill="${palette.mid}"/>
      <circle cx="220" cy="162" r="15" fill="${palette.light}" stroke="${palette.dark}" stroke-width="4"/>
      <path d="M74 190 C112 216 178 218 222 188" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.75"/>
    </g>
  `
}

function renderItemCard(
  item: ArticleVisualItem,
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  palette: Palette,
  options: { showDetail?: boolean; compact?: boolean } = {},
) {
  const tone = tonePalette[item.tone ?? "neutral"]
  const showDetail = options.showDetail ?? true
  const labelY = showDetail ? y + 58 : y + Math.round(height / 2) + 10
  const label = textBlock({
    text: item.label,
    x: x + 104,
    y: labelY,
    width: width - 136,
    size: options.compact ? 27 : 30,
    weight: 850,
    color: palette.text,
    maxLines: showDetail ? 3 : 2,
  })
  const detail = showDetail
    ? textBlock({
        text: item.detail,
        x: x + 104,
        y: y + 58 + label.height + 16,
        width: width - 136,
        size: options.compact ? 21 : 24,
        weight: 500,
        color: "#475569",
        lineHeight: options.compact ? 30 : 34,
        maxLines: 5,
      })
    : null

  return `
    ${card(x, y, width, height)}
    <circle cx="${x + 52}" cy="${y + 58}" r="30" fill="${tone.bg}"/>
    <text x="${x + 43}" y="${y + 68}" font-family="${SVG_FONT_FAMILY}" font-size="28" font-weight="900" fill="${tone.fg}">${index + 1}</text>
    ${label.svg}
    ${detail?.svg ?? ""}
  `
}

function renderFlowMap(visual: ArticleVisual, palette: Palette) {
  const nodes = visual.items.slice(0, 4)
  const labelsOnly = visual.textMode === "labels"
  const yStart = labelsOnly ? 660 : 590
  const cardHeight = labelsOnly ? 126 : 154
  const step = labelsOnly ? 154 : 172
  return nodes
    .map((item, index) => {
      const y = yStart + index * step
      return `
        ${renderItemCard(item, index, 120, y, 1040, cardHeight, palette, { showDetail: !labelsOnly })}
        ${
          index < nodes.length - 1
            ? `<path d="M640 ${y + cardHeight + 2} V${y + step - 6}" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round"/><path d="M626 ${y + step - 14} L640 ${y + step + 2} L654 ${y + step - 14}" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
            : ""
        }
      `
    })
    .join("")
}

function renderTimelineMap(visual: ArticleVisual, palette: Palette) {
  const nodes = visual.items.slice(0, 4)
  const labelsOnly = visual.textMode === "labels"
  const panelX = 120
  const panelY = labelsOnly ? 690 : 620
  const panelWidth = 1040
  const panelHeight = labelsOnly ? 390 : 520
  const slotWidth = panelWidth / Math.max(nodes.length, 1)
  const railY = panelY + 132

  const items = nodes
    .map((item, index) => {
      const x = panelX + index * slotWidth
      const centerX = x + slotWidth / 2
      const label = textBlock({
        text: item.label,
        x: x + 28,
        y: panelY + 238,
        width: slotWidth - 56,
        size: 28,
        weight: 850,
        color: palette.text,
        maxLines: 2,
      })
      const detail = labelsOnly
        ? null
        : textBlock({
            text: item.detail,
            x: x + 28,
            y: panelY + 238 + label.height + 12,
            width: slotWidth - 56,
            size: 20,
            color: "#475569",
            lineHeight: 28,
            maxLines: 3,
          })

      return `
        <circle cx="${centerX}" cy="${railY}" r="32" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
        <circle cx="${centerX}" cy="${railY}" r="12" fill="${palette.dark}"/>
        <rect x="${x + 20}" y="${panelY + 205}" width="${slotWidth - 40}" height="${labelsOnly ? 112 : 230}" rx="24" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
        <text x="${x + 42}" y="${panelY + 194}" font-family="${SVG_FONT_FAMILY}" font-size="22" font-weight="850" fill="${palette.dark}">0${index + 1}</text>
        ${label.svg}
        ${detail?.svg ?? ""}
      `
    })
    .join("")

  return `
    <rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="34" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <path d="M${panelX + 90} ${railY} H${panelX + panelWidth - 90}" stroke="${palette.mid}" stroke-width="10" stroke-linecap="round" opacity="0.72"/>
    <path d="M${panelX + panelWidth - 112} ${railY - 18} L${panelX + panelWidth - 76} ${railY} L${panelX + panelWidth - 112} ${railY + 18}" fill="none" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    ${items}
  `
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
    <text x="252" y="580" font-family="${SVG_FONT_FAMILY}" font-size="28" font-weight="850" fill="${palette.dark}">Safety boundary</text>
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
      return renderFlowMap(visual, palette)
    case "timeline":
      return renderTimelineMap(visual, palette)
    case "warning":
      return renderWarningMap(visual, palette)
    case "checklist":
      return renderChecklistMap(visual, palette)
    case "spectrum":
      return renderSpectrumMap(visual, palette)
  }
}

function getInfographicLayoutPrompt(kind: ArticleVisual["kind"]): string {
  switch (kind) {
    case "comparison":
      return "Use a comparison poster layout with clear grouped columns, repeated icons, and obvious category contrast."
    case "flow":
      return "Use a sequential flow poster layout with a visible start, middle, end, arrows, pathway nodes, and a clean process map."
    case "timeline":
      return "Use an ordered timeline poster layout with milestones, progression markers, and consistent spacing."
    case "warning":
      return "Use a safety-boundary poster layout with calm warning hierarchy, decision split, and safe-vs-urgent pathway."
    case "checklist":
      return "Use a checklist poster layout with grouped cards, check markers, practical zones, and a compact summary band."
    case "spectrum":
      return "Use a spectrum poster layout with graded zones, stepped intensity, or layered categories."
  }
}

function getDefaultVisualFormat(kind: ArticleVisual["kind"]): VisualFormat {
  switch (kind) {
    case "comparison":
      return "comparison-graphic"
    case "flow":
    case "timeline":
      return "process-visual"
    case "warning":
      return "red-flag-warning"
    case "checklist":
      return "patient-education-poster"
    case "spectrum":
      return "medical-infographic"
  }
}

function getVisualFormatPrompt(format: VisualFormat): string {
  switch (format) {
    case "medical-infographic":
      return "Format: medical infographic. Use structured but readable education panels, clinical icons, symptom/risk/prevention grouping, and one strong explanatory diagram. The image must teach one point clearly, not try to carry the full article."
    case "anatomical-explainer":
      return "Format: anatomical explainer. Use clean non-graphic anatomy, simplified body structures, callout labels, arrows, and clear spatial relationships. It should feel like premium patient education, not a textbook plate."
    case "patient-education-poster":
      return "Format: patient education poster. Make it feel shareable and handout-ready with practical panels, warm human context, and a clear take-home pathway."
    case "mechanism-diagram":
      return "Format: mechanism-of-action diagram. Show cause-effect pathways, receptor/cell/process arrows, before-and-after states, and simplified biological mechanisms without overclaiming."
    case "comparison-graphic":
      return "Format: comparison graphic. Use distinct sides or grouped zones, strong contrast, like-for-like criteria, quick-scannable differences, and enough labelled detail to stand alone inside an article."
    case "process-visual":
      return "Format: step-by-step process visual. Use ordered stages, arrows, checkpoints, and clear before/during/after structure. Every stage needs useful detail, not just an icon."
    case "red-flag-warning":
      return "Format: red flag warning graphic. Use calm urgency, clear stop/escalate hierarchy, warning zones, and safety boundaries without fearmongering."
    case "lifestyle-illustration":
      return "Format: lifestyle and prevention illustration. Make it softer, warmer, and relatable with practical habits, domestic detail, daylight, and restrained labels."
    case "body-map":
      return "Format: symptom-location body map. Use a respectful simplified body silhouette, labelled regions, pain/location zones, and clear anatomical orientation."
    case "lab-result-explainer":
      return "Format: lab result explainer. Use specimen-to-result pathway, report snippets, ranges shown abstractly, and plain-language callouts without fake patient data."
    case "telehealth-workflow":
      return "Format: telehealth workflow graphic. Use devices only as supporting objects. The main value must come from intake, clinician review, escalation, records, and outcome checkpoints with a realistic digital-health process."
    case "hero-image":
      return "Format: blog hero image. Prioritise a premium editorial composition with minimal text, strong subject signal, and enough specificity to explain the article at a glance."
  }
}

function promptHash(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function getArtDirectionPrompt(slug: string, visual: ArticleVisual, format: VisualFormat, styleShift = 0): string {
  if (format === "anatomical-explainer" || format === "body-map" || format === "mechanism-diagram") {
    return [
      "Art direction: high-end medical atlas collage with close-cropped anatomy, translucent cutaway layers, magnified inset plates, diagnostic colour washes, precise linework, and tactile print texture.",
      "Use anatomical clarity with visual energy: overlapping panels, depth, asymmetry, and concrete clinical cues. Avoid sparse body icons, blank cream backgrounds, desk still lifes, plants, mugs, scenic backgrounds, and repeated card-grid filler.",
    ].join(" ")
  }

  if (format === "red-flag-warning") {
    return [
      "Art direction: premium emergency-triage editorial poster with full-bleed risk zoning, strong diagonal flow, layered silhouettes, luminous anatomical overlays, and sharp stop/escalate visual hierarchy.",
      "Use firm contrast, kinetic arrows, close-cropped warning insets, and calm urgency. Avoid sparse red-flag icons, single warning triangles, picturesque scenes, dramatic identifiable bodies, lifestyle photography, decorative stationery, and soft wellness styling.",
    ].join(" ")
  }

  const lanes = [
    [
      "Art direction: premium editorial science collage, like a serious magazine explainer: full-bleed clinical texture, bold asymmetric composition, layered anatomy, scan-like fragments, directional ribbons, and compact evidence modules.",
      "Use purposeful visual detail and a strong subject signal, while keeping generous blank space around the focal diagram. No single phone-and-box composition, no isolated lung icon, no clinic-door metaphor, no desk scene, no plants, no coffee cups, no generic blank-object still life.",
    ],
    [
      "Art direction: investigative field-guide wall with hand-inked medical diagrams, pinned specimen-style panels, colour-coded pathways, micro-illustrations, and layered paper texture.",
      "Make it feel authored and specific, with a few strong visual discoveries across the canvas. Avoid identical card rows, generic corporate icons, sterile white cards, empty hero-illustration space, and soft pastel minimalism.",
    ],
    [
      "Art direction: high-contrast data-visualisation poster with layered decision lanes, signal-colour heat zones, scan overlays, micro-diagrams, flow arrows, and one memorable central medical system diagram.",
      "Use hierarchy and visual motion without cramming the canvas. Avoid decorative tabletop objects, scenic windows, coastal backgrounds, blank phone screens, empty white-card grids, and simple icon rows.",
    ],
    [
      "Art direction: premium public-health campaign poster with close-cropped practical cues, dramatic cropping, layered process maps, saturated accent blocks, mixed panel sizes, and tactile print grain.",
      "Use human context only as anonymous silhouettes or partial gestures. Avoid desk flat lays, mug/notebook/plant compositions, blank medicine boxes, product packaging, and abstract blobs.",
    ],
    [
      "Art direction: crafted technical wall chart with blueprint depth, modular blocks, thick route lines, callout rings, macro anatomy plates, shadowed layers, and precise icon systems.",
      "Keep it authoritative but visually alive. Avoid postcard scenery, cute illustrations, lifestyle stock composition, blank app mockups, beige wellness mush, and flat two-object compositions.",
    ],
  ]

  return lanes[promptHash(`${slug}:${visual.id}:${styleShift}`) % lanes.length].join(" ")
}

function getFooterCopy(visual: ArticleVisual): string {
  if (visual.visualFormat === "red-flag-warning" || visual.kind === "warning") {
    return "Educational guide. Urgent symptoms need urgent care."
  }

  return "Educational guide."
}

function sanitizeImagePrompt(prompt: string): string {
  const obsoleteFragments = [
    /\bcompletely textless\b/gi,
    /\btextless\b/gi,
    /\bno readable text\b/gi,
    /\bno words?\b/gi,
    /\bno letters?\b/gi,
    /\bwithout labels?\b/gi,
    /\bblank phone(?: screen)?\b/gi,
    /\bblank (?:screen|screens|app|apps|ui|interface|interfaces|device|devices)\b/gi,
    /\bblank (?:document|documents|certificate|certificates|form|forms|card|cards|credential card|pricing card|privacy document|notebook|page|pages|paper|papers|rounded tiles?)\b/gi,
    /\bneutral medicine box\b/gi,
    /\bblank medicine (?:box|boxes|packet|packets|package|packages)\b/gi,
    /\bsimple abstract branches\b/gi,
    /\bfaint abstract lines\b/gi,
    /\babstract urgency marker\b/gi,
    /\bsoft checkmark shapes\b/gi,
    /\bsoft blue and amber accents\b/gi,
    /\bwarm ivory (?:desk|clinical background|background)\b/gi,
    /\bminimal still life\b/gi,
    /\bstill life\b/gi,
    /\bdesk flat lay\b/gi,
    /\bflat lay\b/gi,
    /\btea cup\b/gi,
    /\bcoffee cup\b/gi,
    /\bmug\b/gi,
    /\bplant\b/gi,
  ]

  let cleaned = prompt
  for (const fragment of obsoleteFragments) {
    cleaned = cleaned.replace(fragment, "")
  }

  return cleaned
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*,\s*/, "")
    .replace(/\s*,\s*$/, "")
    .trim()
}

function getAssetOrientation(size: GatewayImageSize): string {
  if (size === "1536x1024") return "landscape"
  if (size === "1024x1024") return "square"
  return "portrait"
}

function getTextPlanPrompt(visual: ArticleVisual, _format: VisualFormat): string {
  // gpt-image-2 renders text accurately, so this is a TEACHING infographic that
  // should contain legible, informative text. All visible text is drawn ONLY from
  // the registry (eyebrow, title, and each item's label + detail) so it stays
  // controlled and accurate — the model must not invent copy. The same labels also
  // render in React/HTML via components/blog/article-visuals.tsx for accessibility.
  const labelLines = visual.items
    .map((item) => (item.detail ? `- "${item.label}" — ${item.detail}` : `- "${item.label}"`))
    .join("\n")

  return [
    "Visible text plan: this is a teaching infographic, so it SHOULD contain accurate, legible text. Integrate the exact wording below as crisp, correctly spelled, high-contrast text: a clear headline, labelled sections/columns/steps, and short callouts. Do not leave it as a near-textless graphic.",
    `Kicker / eyebrow (small, above or near the headline): "${visual.eyebrow}"`,
    `Headline (most prominent text): "${visual.title}"`,
    "Section labels with their short callouts — render each label clearly, and include the short callout text beside or under it where it fits:",
    labelLines,
    "Hard text rules:",
    "- Use ONLY the exact wording provided above. Do NOT invent extra headings, statistics, prices, percentages, dates, drug or brand names, legal claims, source names, captions, footers, or calls to action.",
    "- Spell every word correctly and exactly as written. If a word risks rendering garbled, render it again cleanly rather than distorting or abbreviating it.",
    "- Keep callouts short (the full explanation lives in the article), but the headline and every section label must be present and readable.",
    "- No fake document body text, no fake UI text, no fake form fields, no signatures, no fake percentages or chart numbers.",
  ].join("\n")
}

function buildGatewayPrompt(
  slug: string,
  visual: ArticleVisual,
  styleShift = 0,
  size: GatewayImageSize = DEFAULT_GATEWAY_SIZE,
): string {
  const format = visual.visualFormat ?? getDefaultVisualFormat(visual.kind)
  const cleanedPrimaryRequest = sanitizeImagePrompt(visual.imagePrompt)
  const orientation = getAssetOrientation(size)

  return [
    `Use case: ${format}`,
    `Asset type: ${orientation} health-guide visual for a premium Australian digital health website.`,
    `Model: ${GPT_IMAGE_MODEL}.`,
    "",
    "Primary request:",
    cleanedPrimaryRequest,
    "",
    getVisualFormatPrompt(format),
    "Create a polished visual teaching asset that looks art-directed by a senior editorial designer. It should support the article, not try to replace the article.",
    "Teaching-value floor: the viewer should understand one clear idea, distinction, warning boundary, or process from the image. The full explanation lives in the HTML article, so keep callouts short — but DO render the labelled text from the visible text plan accurately and legibly. This is a teaching infographic, not a textless graphic.",
    "Quality floor: this must not look like a thumbnail, placeholder, clip-art hero image, sterile SaaS illustration, minimal still life, stock-photo desk scene, or low-information metaphor. A single phone, inhaler, document, medicine box, warning triangle, shield, scale, checklist, blank card, abstract blob cluster, or generic icon row is an automatic failure.",
    "Composition floor: use 2 to 4 strong visual regions, one clear focal diagram, and generous breathing room. Prefer a memorable central scene or diagram with a few supporting callouts over a dense poster grid.",
    "Premium floor: make the composition feel designed and specific to this article. Use hierarchy, restrained callout arrows, diagrams, and a clear reading path. Leave enough negative space that the image feels premium, not cluttered.",
    "Legacy prompt override: obsolete low-information prompt fragments were removed before this request. Preserve privacy and avoid fake documents, but do not obey any implied instruction to make the visual textless, blank, minimal, symbolic-only, or object-only.",
    "Banned visual archetypes: blank desk scene, plain object arrangement, soft beige tabletop, isolated phone mockup, blank certificate or document, empty checklist, box plus card, balance scale metaphor, shield-plus-pill cards, generic safety icon row, oversized abstract shapes, empty app cards, simple corporate vector mascot, or any image where most of the canvas could be swapped into another article unchanged.",
    getInfographicLayoutPrompt(visual.kind),
    getArtDirectionPrompt(slug, visual, format, styleShift),
    "",
    getTextPlanPrompt(visual, format),
    "Text quality rule: visible text must be crisp, correctly spelled, and accurate to the visible text plan above. Render the headline and every section label clearly and legibly, and include the short callouts where they remain readable. Only fake document bodies or form fields should use abstract grey line placeholders — never legible fake document wording.",
    "Use visual diagrams for the rest of the meaning: route lines, icons, colour zones, magnified document regions, abstract verification nodes, privacy locks, decision branches, and safe/uncertain/escalate pathways.",
    "",
    "Style:",
    "Premium educational design, but vary the visual language from article to article. Do not default to the same ivory paper, navy serif headline, three-card row, mug, plant, notebook, and coastline composition.",
    "Typography should match the selected art direction: clean sans-led systems for process, comparison, regulatory, workflow, and lab visuals; atlas labels for anatomy; only occasional hand lettering for small annotations. Do not use the repeated giant navy display-serif headline treatment unless the individual prompt explicitly asks for an editorial poster.",
    "Use the selected art direction above as the main style contract. Keep the information readable, structured, and specific, but make each visual feel art-directed for its own topic.",
    "Avoid bland corporate gradients, generic hospital stock art, excessive symmetry, plastic 3D icons, over-polished AI faces, fake app screenshots, vague wellness imagery, and beige wellness mush.",
    "Create the complete final poster inside the generated image. A small InstantMed wordmark badge is composited into the bottom-right corner after generation, so keep roughly a 270x64px zone in the very bottom-right corner clear of essential text, labels, or focal diagram content.",
    "",
    "Hard constraints:",
    "No brand logos, no official seals, no medical crosses, no plus-sign medical symbols, no balance scales, no medication brand names, no pill imprints, no celebrity likenesses, no gore, no graphic symptoms, no consultation CTA, no website UI, no fake doctor-patient chat. If a person appears, make them non-identifiable, natural, and secondary. Do not draw the InstantMed logo or wordmark.",
    "No decorative office or lifestyle props: no plants, mugs, coffee cups, notebooks, pens, desk flat lays, paper scraps, masking tape, clipboards, envelopes, or stationery filler unless the exact article prompt explicitly requires that object as the main teaching subject.",
    "No Australian tourist scenery unless the article itself is specifically about travel, location, or geography. Do not include beaches, coastline, ocean views, harbour bridges, city skylines, gum trees as filler, kangaroos, flags, Australian maps, country outlines, lifeguard towers, postcard footers, or scenic lookout paths.",
    "Article context: patient education visual. Do not render or infer website names, slug text, or article metadata.",
    `Style retry seed for context only: ${styleShift}.`,
  ].join("\n")
}

function buildGatewayCompositeUnderlayPrompt(slug: string, visual: ArticleVisual, styleShift = 0): string {
  const format = visual.visualFormat ?? getDefaultVisualFormat(visual.kind)
  const cleanedPrimaryRequest = sanitizeImagePrompt(visual.imagePrompt)

  return [
    `Use case: ${format}`,
    "Asset type: text-free underlay for a portrait health-guide visual on a premium Australian digital health website.",
    `Model: ${GPT_IMAGE_MODEL}.`,
    "",
    "Primary visual subject:",
    cleanedPrimaryRequest,
    "",
    getVisualFormatPrompt(format),
    getInfographicLayoutPrompt(visual.kind),
    getArtDirectionPrompt(slug, visual, format, styleShift),
    "",
    "Your job is the image field only. A production script will overlay all approved article copy, cards, footer text, and the official brand badge after generation.",
    "Create an article-specific educational visual underlay using unlabeled diagrams, body/anatomy shapes, process arrows, comparison zones, warning hierarchy, texture, clinical iconography, and practical objects only when they teach the topic.",
    "Boring-output rejection rule: a simple phone, simple lung, door, checklist card, flag, single warning icon, isolated body silhouette, soft pastel blob, or two-to-three-symbol composition is an automatic failure. Do not make polite health-tech clip art.",
    "Composition requirement: fill the portrait canvas with at least 7 distinct visual clusters, strong foreground/midground/background depth, diagonal or radial movement, and dense article-specific clinical cues around the overlay-safe areas. The viewer should feel there is useful visual information at the edges, behind the title area, and between the copy cards.",
    "Style requirement: premium editorial, tactile, layered, specific, and memorable. Use richer contrast, controlled saturation, print grain, scan texture, cutaway anatomy, route lines, risk zones, and overlapping panels. Avoid beige emptiness and washed-out minimalism.",
    "Hard visible-text rule: no readable words, letters, numbers, tables, fake UI, fake forms, captions, labels, badges, stamps, signatures, handwriting, prescription text, chart labels, or signage. The final asset must contain zero generated text.",
    "Avoid generic stock art, blank phone hero, blank document hero, medicine-box hero, desk flat lay, balance-scale metaphors, scenic landscapes, road/path metaphors, clinic-door metaphors, mountains, beaches, coastlines, ocean, city skylines, Australian maps, flags, landmarks, and decorative abstract blobs. The underlay still needs to be specific to the article.",
    "No identifiable people, no fake doctor faces, no doctor-patient consultation scene, no medical crosses, no pharmacy cross signs, no plus-sign shop signs, no pills, no tablets, no capsules, no pill blister packs, no medicine bottles as focal objects, no official seals, no logos, no medication brand names, no pill imprints, no gore, no graphic symptoms, no consultation CTA.",
    "Leave the bottom-right 320 by 110 pixel area calm and low-detail for the production badge overlay.",
    "Article context: patient education visual. Do not render or infer website names, slug text, or article metadata.",
    `Style retry seed for context only: ${styleShift}.`,
  ].join("\n")
}

function renderBrandBadgeBackgroundSvg(imgW: number, imgH: number): string {
  const x = imgW - BRAND_BADGE_WIDTH - BRAND_BADGE_MARGIN
  const y = imgH - BRAND_BADGE_HEIGHT - BRAND_BADGE_MARGIN

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}" viewBox="0 0 ${imgW} ${imgH}">
      <rect x="${x}" y="${y}" width="${BRAND_BADGE_WIDTH}" height="${BRAND_BADGE_HEIGHT}" rx="18" fill="#f8f7f4" fill-opacity="0.84" stroke="#d8e4f8" stroke-width="1.25"/>
    </svg>
  `
}

async function addInstantMedWordmark(filepath: string) {
  const tmpPath = `${filepath}.wordmark-tmp.webp`
  const meta = await sharp(filepath).metadata()
  const imgW = meta.width ?? WIDTH
  const imgH = meta.height ?? HEIGHT
  const x = imgW - BRAND_BADGE_WIDTH - BRAND_BADGE_MARGIN
  const y = imgH - BRAND_BADGE_HEIGHT - BRAND_BADGE_MARGIN
  const contentGap = 10
  const contentWidth = BRAND_LOGO_SIZE + contentGap + BRAND_WORDMARK_WIDTH
  const contentX = x + Math.round((BRAND_BADGE_WIDTH - contentWidth) / 2)
  const logoY = y + Math.round((BRAND_BADGE_HEIGHT - BRAND_LOGO_SIZE) / 2)
  const wordmarkY = y + Math.round((BRAND_BADGE_HEIGHT - BRAND_WORDMARK_HEIGHT) / 2)
  const logo = await sharp(BRAND_LOGO_PATH)
    .resize(BRAND_LOGO_SIZE, BRAND_LOGO_SIZE, { fit: "contain" })
    .png()
    .toBuffer()
  const wordmark = await sharp(BRAND_WORDMARK_PATH)
    .resize(BRAND_WORDMARK_WIDTH, BRAND_WORDMARK_HEIGHT, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer()

  await sharp(filepath)
    .composite([
      { input: Buffer.from(renderBrandBadgeBackgroundSvg(imgW, imgH)), left: 0, top: 0 },
      { input: logo, left: contentX, top: logoY },
      { input: wordmark, left: contentX + BRAND_LOGO_SIZE + contentGap, top: wordmarkY },
    ])
    .webp({ quality: 88, effort: 5 })
    .toFile(tmpPath)

  await fs.rename(tmpPath, filepath)
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
    text: getFooterCopy(visual),
    x: 164,
    y: 1490,
    width: 360,
    size: 22,
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
      ${renderBackgroundTexture(palette)}
      ${badge(80, 72, visual.eyebrow, palette)}
      ${renderVisualMotif(visual, palette)}
      ${title.svg}
      ${summary.svg}
      <g filter="url(#softShadow)">
        ${renderMap(visual, palette)}
      </g>
      <rect x="80" y="1432" width="462" height="86" rx="28" fill="${palette.dark}"/>
      <circle cx="124" cy="1476" r="24" fill="#ffffff" opacity="0.18"/>
      <path d="M112 1477 L123 1488 L142 1463" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      ${footer.svg}
    </svg>
  `
}

function renderCompositeOverlaySvg(visual: ArticleVisual): string {
  const palette = palettes[visual.accent]
  const title = textBlock({
    text: visual.title,
    x: 112,
    y: 168,
    width: 760,
    size: 50,
    weight: 900,
    color: palette.dark,
    lineHeight: 60,
    maxLines: 4,
  })
  const summary = textBlock({
    text: visual.summary,
    x: 116,
    y: 168 + title.height + 30,
    width: 770,
    size: 27,
    weight: 550,
    color: "#334155",
    lineHeight: 38,
    maxLines: 3,
  })
  const itemCards = visual.items
    .slice(0, 4)
    .map((item, index) => renderItemCard(item, index, 96, 770 + index * 170, 820, 148, palette))
    .join("")
  const footer = textBlock({
    text: getFooterCopy(visual),
    x: 164,
    y: 1502,
    width: 680,
    size: 23,
    weight: 700,
    color: "#ffffff",
    maxLines: 1,
  })

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <filter id="panelShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.15"/>
        </filter>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.wash}" fill-opacity="0.28"/>
      <g filter="url(#panelShadow)">
        <rect x="80" y="70" width="860" height="405" rx="30" fill="#ffffff" fill-opacity="0.88" stroke="${palette.light}" stroke-width="2"/>
      </g>
      ${badge(112, 102, visual.eyebrow, palette)}
      ${title.svg}
      ${summary.svg}
      <g filter="url(#panelShadow)">
        ${itemCards}
      </g>
      <rect x="80" y="1430" width="820" height="104" rx="30" fill="${palette.dark}" fill-opacity="0.92"/>
      <circle cx="128" cy="1482" r="26" fill="#ffffff" opacity="0.16"/>
      <path d="M116 1483 L128 1495 L148 1468" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
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
  await addInstantMedWordmark(filepath)
  return filepath
}

async function saveGatewayInfographic(
  slug: string,
  visual: ArticleVisual,
  styleShift = 0,
  size: GatewayImageSize = DEFAULT_GATEWAY_SIZE,
) {
  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visual.id}.webp`)
  const result = await generateImage({
    model: gateway.image(GPT_IMAGE_MODEL),
    prompt: buildGatewayPrompt(slug, visual, styleShift, size),
    size,
    providerOptions: {
      gateway: {
        tags: ["feature:blog-visuals", `article:${slug}`, "renderer:gpt-image-2", `style-shift:${styleShift}`],
      },
    },
  })

  await sharp(Buffer.from(result.image.uint8Array))
    .webp({ quality: 88, effort: 5 })
    .toFile(filepath)

  await addInstantMedWordmark(filepath)
  return filepath
}

async function saveGatewayCompositeInfographic(
  slug: string,
  visual: ArticleVisual,
  styleShift = 0,
  size: GatewayImageSize = DEFAULT_GATEWAY_SIZE,
) {
  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visual.id}.webp`)
  const palette = palettes[visual.accent]
  const result = await generateImage({
    model: gateway.image(GPT_IMAGE_MODEL),
    prompt: buildGatewayCompositeUnderlayPrompt(slug, visual, styleShift),
    size,
    providerOptions: {
      gateway: {
        tags: ["feature:blog-visuals", `article:${slug}`, "renderer:gpt-image-2-composite", `style-shift:${styleShift}`],
      },
    },
  })

  await sharp(Buffer.from(result.image.uint8Array))
    .resize(WIDTH, HEIGHT, { fit: "cover", background: palette.wash })
    .composite([{ input: Buffer.from(renderCompositeOverlaySvg(visual)), left: 0, top: 0 }])
    .webp({ quality: 88, effort: 5 })
    .toFile(filepath)

  await addInstantMedWordmark(filepath)
  return filepath
}

async function main() {
  const slugFilters = getSlugFilters()
  const visualFilter = getArg("visual")
  const limit = Number(getArg("limit") ?? "0")
  const styleShift = Number(getArg("style-shift") ?? "0")
  const gatewayImageSize = getGatewayImageSize()
  const dryRun = hasFlag("dry-run")
  const force = hasFlag("force")
  const renderer = getRenderer()

  if (renderer === "gpt-image-2" || renderer === "gpt-image-2-composite") {
    assertGatewayAuth()
  }

  const visualsBySlug = getAllTopArticleVisuals()
  const jobs = TOP_VISUAL_ARTICLE_SLUGS
    .filter((slug) => !slugFilters || slugFilters.has(slug))
    .flatMap((slug) =>
      visualsBySlug[slug].filter((visual) => !visualFilter || visual.id === visualFilter).map((visual) => ({ slug, visual })),
    )
    .slice(0, limit > 0 ? limit : undefined)

  if (jobs.length === 0) {
    const slugMessage = slugFilters ? ` for ${Array.from(slugFilters).join(", ")}` : ""
    throw new Error(
      `No visual jobs found${slugMessage}${visualFilter ? ` and --visual=${visualFilter}` : ""}.`,
    )
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
      const output =
        renderer === "gpt-image-2"
          ? buildGatewayPrompt(slug, visual, styleShift, gatewayImageSize)
          : renderer === "gpt-image-2-composite"
            ? buildGatewayCompositeUnderlayPrompt(slug, visual, styleShift)
            : renderArticleVisualSvg(slug, visual)
      console.log(`\n--- ${slug}/${visual.id} (${renderer}) ---\n${output}`)
      continue
    }

    console.log(`Generating ${renderer} visual ${slug}/${visual.id}...`)
    const saved =
      renderer === "gpt-image-2"
        ? await saveGatewayInfographic(slug, visual, styleShift, gatewayImageSize)
        : renderer === "gpt-image-2-composite"
          ? await saveGatewayCompositeInfographic(slug, visual, styleShift, gatewayImageSize)
          : await saveInfographic(slug, visual)
    console.log(`Saved ${path.relative(process.cwd(), saved)}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
