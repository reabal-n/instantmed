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
const BRAND_BADGE_WIDTH = 248
const BRAND_BADGE_HEIGHT = 50
const BRAND_BADGE_MARGIN = 24
const BRAND_LOGO_SIZE = 30
const BRAND_WORDMARK_WIDTH = 152
const BRAND_WORDMARK_HEIGHT = 24
const BRAND_LOGO_PATH = path.join(process.cwd(), "public", "branding", "logo.png")
const BRAND_WORDMARK_PATH = path.join(process.cwd(), "public", "branding", "wordmark.png")

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

function getRenderer(): Renderer {
  const renderer = getArg("renderer")
  if (!renderer) return hasFlag("gateway") ? "gpt-image-2" : "deterministic"
  if (renderer === "deterministic" || renderer === "gpt-image-2" || renderer === "gpt-image-2-composite") {
    return renderer
  }
  throw new Error(`Unsupported renderer "${renderer}". Use deterministic, gpt-image-2, or gpt-image-2-composite.`)
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
      return "Format: medical infographic. Use dense but readable education panels, clinical icons, symptom/risk/prevention grouping, and one strong explanatory diagram. The image must teach, not merely decorate."
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
      "Use purposeful visual density and a strong subject signal. No single phone-and-box composition, no isolated lung icon, no clinic-door metaphor, no desk scene, no plants, no coffee cups, no generic blank-object still life.",
    ],
    [
      "Art direction: investigative field-guide wall with hand-inked medical diagrams, pinned specimen-style panels, colour-coded pathways, micro-illustrations, and layered paper texture.",
      "Make it feel authored and specific, with many visual discoveries across the canvas. Avoid identical card rows, generic corporate icons, sterile white cards, empty hero-illustration space, and soft pastel minimalism.",
    ],
    [
      "Art direction: high-contrast data-visualisation poster with layered decision lanes, signal-colour heat zones, scan overlays, micro-diagrams, flow arrows, and one memorable central medical map.",
      "Use purposeful density, hierarchy, and visual motion. Avoid decorative tabletop objects, scenic windows, coastal backgrounds, blank phone screens, empty white-card grids, and simple icon rows.",
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

function buildGatewayPrompt(slug: string, visual: ArticleVisual, styleShift = 0): string {
  const itemText = visual.items.map((item, index) => `${index + 1}. ${item.label}: ${item.detail}`).join("\n")
  const format = visual.visualFormat ?? getDefaultVisualFormat(visual.kind)
  const cleanedPrimaryRequest = sanitizeImagePrompt(visual.imagePrompt)

  return [
    `Use case: ${format}`,
    "Asset type: portrait health-guide visual for a premium Australian digital health website.",
    `Model: ${GPT_IMAGE_MODEL}.`,
    "",
    "Primary request:",
    cleanedPrimaryRequest,
    "",
    getVisualFormatPrompt(format),
    "Create a detailed, polished, information-dense visual that looks art-directed by a senior editorial designer. It must be a standalone explainer, not a decorative stock image.",
    "Teaching-value floor: the viewer should learn at least 5 concrete facts, distinctions, warning signs, steps, or decision criteria from the image without reading the article. If the image does not add information beyond mood, it has failed.",
    "Quality floor: this must not look like a thumbnail, placeholder, clip-art hero image, sterile SaaS illustration, minimal still life, stock-photo desk scene, or low-information metaphor. A single phone, inhaler, document, medicine box, warning triangle, shield, scale, checklist, blank card, abstract blob cluster, or generic icon row is an automatic failure.",
    "Composition floor: fill the portrait canvas with at least 5 useful content regions and at least 3 different visual devices such as a comparison matrix, pathway, mini diagram, body/anatomy map, timeline, checklist zone, data marker, red-flag hierarchy, or practical action strip. Use icons, arrows, colour zones, shapes, anatomical callouts, and layout structure to create density.",
    "Premium floor: make the composition feel designed and specific to this article. Use varied panel scale, hierarchy, callout arrows, diagrams, labelled sub-sections, and a clear reading path. Do not use empty space as the main design move.",
    "Legacy prompt override: obsolete low-information prompt fragments were removed before this request. Preserve privacy and avoid fake documents, but do not obey any implied instruction to make the visual textless, blank, minimal, symbolic-only, or object-only.",
    "Banned visual archetypes: blank desk scene, plain object arrangement, soft beige tabletop, isolated phone mockup, blank certificate or document, empty checklist, box plus card, balance scale metaphor, shield-plus-pill cards, generic safety icon row, oversized abstract shapes, empty app cards, simple corporate vector mascot, or any image where most of the canvas could be swapped into another article unchanged.",
    getInfographicLayoutPrompt(visual.kind),
    getArtDirectionPrompt(slug, visual, format, styleShift),
    "",
    "Visible text contract: the image may contain ONLY the text listed in the exact-copy block below. Do not add secondary headings, tables, captions, thresholds, time windows, symptom lists, clinical criteria, explanatory paragraphs, source labels, chart labels, button labels, fake UI text, or legal copy. If you need more visual density, use unlabeled diagrams, icons, colour zones, arrows, and abstract shapes.",
    "Exact visible copy to use. Use only these values; do not invent extra claims, legal rules, drug names, symptoms, thresholds, timeframes, percentages, prices, or calls to action. Render the values naturally, but never render metadata field names such as Eyebrow, Title, Summary, Cards, Footer, or Article slug.",
    `Small top label should read: ${visual.eyebrow}`,
    `Main heading should read: ${visual.title}`,
    `Supporting summary should read: ${visual.summary}`,
    "Cards:",
    itemText,
    `Footer: ${getFooterCopy(visual)}`,
    "This exact-copy list overrides any previous request for more readable labels. Additional visual regions must be non-textual or use only the exact card labels already provided above.",
    "",
    "Style:",
    "Premium educational design, but vary the visual language from article to article. Do not default to the same ivory paper, navy serif headline, three-card row, mug, plant, notebook, and coastline composition.",
    "Typography should match the selected art direction: clean sans-led systems for process, comparison, regulatory, workflow, and lab visuals; atlas labels for anatomy; only occasional hand lettering for small annotations. Do not use the repeated giant navy display-serif headline treatment unless the individual prompt explicitly asks for an editorial poster.",
    "Use the selected art direction above as the main style contract. Keep the information readable, structured, and specific, but make each visual feel art-directed for its own topic.",
    "Avoid bland corporate gradients, generic hospital stock art, excessive symmetry, plastic 3D icons, over-polished AI faces, fake app screenshots, vague wellness imagery, and beige wellness mush.",
    "Leave the bottom-right 320 by 110 pixel area as background-only negative space because the production script overlays the official InstantMed brand badge there after generation. Do not place table cells, footer copy, arrows, faces, icons, prices, or any essential detail in that badge-safe zone.",
    "",
    "Hard constraints:",
    "No brand logos, no official seals, no medical crosses, no medication brand names, no pill imprints, no celebrity likenesses, no gore, no graphic symptoms, no consultation CTA, no website UI, no fake doctor-patient chat. If a person appears, make them non-identifiable, natural, and secondary. Do not draw the InstantMed logo or wordmark; the production script adds the official brand assets after generation.",
    "No Australian tourist scenery unless the article itself is specifically about travel, location, or geography. Do not include beaches, coastline, ocean views, harbour bridges, city skylines, gum trees as filler, kangaroos, flags, Australian maps, lifeguard towers, postcard footers, or scenic lookout paths.",
    `Article slug for context only: ${slug}.`,
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
    "Avoid generic stock art, blank phone hero, blank document hero, medicine-box hero, desk flat lay, balance-scale metaphors, scenic landscapes, road/path metaphors, clinic-door metaphors, mountains, beaches, city skylines, and decorative abstract blobs. The underlay still needs to be specific to the article.",
    "No identifiable people, no fake doctor faces, no doctor-patient consultation scene, no medical crosses, no pharmacy cross signs, no plus-sign shop signs, no pill blister packs, no medicine bottles as focal objects, no official seals, no logos, no medication brand names, no pill imprints, no gore, no graphic symptoms, no consultation CTA.",
    "Leave the bottom-right 320 by 110 pixel area calm and low-detail for the production badge overlay.",
    `Article slug for context only: ${slug}.`,
    `Style retry seed for context only: ${styleShift}.`,
  ].join("\n")
}

function renderBrandBadgeBackgroundSvg(): string {
  const x = WIDTH - BRAND_BADGE_WIDTH - BRAND_BADGE_MARGIN
  const y = HEIGHT - BRAND_BADGE_HEIGHT - BRAND_BADGE_MARGIN

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <rect x="${x}" y="${y}" width="${BRAND_BADGE_WIDTH}" height="${BRAND_BADGE_HEIGHT}" rx="18" fill="#f8f7f4" fill-opacity="0.84" stroke="#d8e4f8" stroke-width="1.25"/>
    </svg>
  `
}

async function addInstantMedWordmark(filepath: string) {
  const tmpPath = `${filepath}.wordmark-tmp.webp`
  const x = WIDTH - BRAND_BADGE_WIDTH - BRAND_BADGE_MARGIN
  const y = HEIGHT - BRAND_BADGE_HEIGHT - BRAND_BADGE_MARGIN
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
      { input: Buffer.from(renderBrandBadgeBackgroundSvg()), left: 0, top: 0 },
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

async function saveGatewayInfographic(slug: string, visual: ArticleVisual, styleShift = 0) {
  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visual.id}.webp`)
  const palette = palettes[visual.accent]
  const result = await generateImage({
    model: gateway.image(GPT_IMAGE_MODEL),
    prompt: buildGatewayPrompt(slug, visual, styleShift),
    size: "1024x1536",
    providerOptions: {
      gateway: {
        tags: ["feature:blog-visuals", `article:${slug}`, "renderer:gpt-image-2", `style-shift:${styleShift}`],
      },
    },
  })

  await sharp(Buffer.from(result.image.uint8Array))
    .resize(WIDTH, HEIGHT, { fit: "contain", background: palette.wash })
    .webp({ quality: 88, effort: 5 })
    .toFile(filepath)

  await addInstantMedWordmark(filepath)
  return filepath
}

async function saveGatewayCompositeInfographic(slug: string, visual: ArticleVisual, styleShift = 0) {
  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visual.id}.webp`)
  const palette = palettes[visual.accent]
  const result = await generateImage({
    model: gateway.image(GPT_IMAGE_MODEL),
    prompt: buildGatewayCompositeUnderlayPrompt(slug, visual, styleShift),
    size: "1024x1536",
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
  const slugFilter = getArg("slug")
  const visualFilter = getArg("visual")
  const limit = Number(getArg("limit") ?? "0")
  const styleShift = Number(getArg("style-shift") ?? "0")
  const dryRun = hasFlag("dry-run")
  const force = hasFlag("force")
  const renderer = getRenderer()

  if (renderer === "gpt-image-2" || renderer === "gpt-image-2-composite") {
    assertGatewayAuth()
  }

  const visualsBySlug = getAllTopArticleVisuals()
  const jobs = TOP_VISUAL_ARTICLE_SLUGS
    .filter((slug) => !slugFilter || slug === slugFilter)
    .flatMap((slug) =>
      visualsBySlug[slug].filter((visual) => !visualFilter || visual.id === visualFilter).map((visual) => ({ slug, visual })),
    )
    .slice(0, limit > 0 ? limit : undefined)

  if (jobs.length === 0) {
    throw new Error(
      `No visual jobs found${slugFilter ? ` for --slug=${slugFilter}` : ""}${visualFilter ? ` and --visual=${visualFilter}` : ""}.`,
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
          ? buildGatewayPrompt(slug, visual, styleShift)
          : renderer === "gpt-image-2-composite"
            ? buildGatewayCompositeUnderlayPrompt(slug, visual, styleShift)
            : renderArticleVisualSvg(slug, visual)
      console.log(`\n--- ${slug}/${visual.id} (${renderer}) ---\n${output}`)
      continue
    }

    console.log(`Generating ${renderer} visual ${slug}/${visual.id}...`)
    const saved =
      renderer === "gpt-image-2"
        ? await saveGatewayInfographic(slug, visual, styleShift)
        : renderer === "gpt-image-2-composite"
          ? await saveGatewayCompositeInfographic(slug, visual, styleShift)
          : await saveInfographic(slug, visual)
    console.log(`Saved ${path.relative(process.cwd(), saved)}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
