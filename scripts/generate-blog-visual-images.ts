/* eslint-disable no-console */

import fs from "node:fs/promises"
import path from "node:path"

import { gateway, generateImage } from "ai"
import { openai } from "@ai-sdk/openai"
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
const KIE_API_BASE_URL = "https://api.kie.ai"
const KIE_GPT_IMAGE_2_MODEL = "gpt-image-2-text-to-image"
const KIE_NANO_BANANA_2_MODEL = "nano-banana-2"
const DEFAULT_GATEWAY_SIZE = "1024x1536"
const supportedGatewaySizes = ["1024x1024", "1024x1536", "1536x1024"] as const
type GatewayImageSize = (typeof supportedGatewaySizes)[number]
const supportedKieResolutions = ["1K", "2K", "4K"] as const
type KieResolution = (typeof supportedKieResolutions)[number]
const BRAND_BADGE_WIDTH = 248
const BRAND_BADGE_HEIGHT = 50
const BRAND_BADGE_MARGIN = 24
const BRAND_LOGO_SIZE = 30
const BRAND_WORDMARK_WIDTH = 152
const BRAND_WORDMARK_HEIGHT = 24
const BRAND_LOGO_PATH = path.join(process.cwd(), "public", "branding", "logo.png")
const BRAND_WORDMARK_PATH = path.join(process.cwd(), "public", "branding", "wordmark.png")
const SVG_FONT_FAMILY = "Arial, Helvetica, sans-serif"

type Renderer =
  | "deterministic"
  | "deterministic-composite"
  | "openai-gpt-image-2"
  | "openai-gpt-image-2-composite"
  | "gpt-image-2"
  | "gpt-image-2-composite"
  | "kie-gpt-image-2"
  | "kie-gpt-image-2-composite"
  | "kie-nano-banana-2"
  | "kie-nano-banana-2-composite"
type VisualFormat = NonNullable<ArticleVisual["visualFormat"]>
type KieRenderer = Extract<
  Renderer,
  "kie-gpt-image-2" | "kie-gpt-image-2-composite" | "kie-nano-banana-2" | "kie-nano-banana-2-composite"
>
type KieDirectRenderer = Extract<Renderer, "kie-gpt-image-2" | "kie-nano-banana-2">

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
  if (!renderer) return hasFlag("gateway") ? "gpt-image-2-composite" : "deterministic"
  if (
    renderer === "deterministic" ||
    renderer === "deterministic-composite" ||
    renderer === "openai-gpt-image-2" ||
    renderer === "openai-gpt-image-2-composite" ||
    renderer === "gpt-image-2" ||
    renderer === "gpt-image-2-composite" ||
    renderer === "kie-gpt-image-2" ||
    renderer === "kie-gpt-image-2-composite" ||
    renderer === "kie-nano-banana-2" ||
    renderer === "kie-nano-banana-2-composite"
  ) {
    return renderer
  }
  throw new Error(
    `Unsupported renderer "${renderer}". Use deterministic, deterministic-composite, openai-gpt-image-2, openai-gpt-image-2-composite, gpt-image-2, gpt-image-2-composite, kie-gpt-image-2, kie-gpt-image-2-composite, kie-nano-banana-2, or kie-nano-banana-2-composite.`,
  )
}

function getEffectiveRenderer(renderer: Renderer, visual: ArticleVisual): Renderer {
  if (renderer === "deterministic" && visual.textMode === "labels") {
    return "deterministic-composite"
  }

  if (renderer === "gpt-image-2" && visual.textMode === "labels") {
    return "gpt-image-2-composite"
  }

  if (renderer === "openai-gpt-image-2" && visual.textMode === "labels") {
    return "openai-gpt-image-2-composite"
  }

  return renderer
}

function getGatewayImageSize(): GatewayImageSize {
  const size = getArg("size")
  if (!size) return DEFAULT_GATEWAY_SIZE
  if (supportedGatewaySizes.includes(size as GatewayImageSize)) return size as GatewayImageSize
  throw new Error(`Unsupported --size "${size}". Use ${supportedGatewaySizes.join(", ")}.`)
}

function getKieResolution(): KieResolution {
  const resolution = getArg("kie-resolution")
  if (!resolution) return "2K"
  if (supportedKieResolutions.includes(resolution as KieResolution)) return resolution as KieResolution
  throw new Error(`Unsupported --kie-resolution "${resolution}". Use ${supportedKieResolutions.join(", ")}.`)
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

function assertOpenAIAuth() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY. Set it in .env.local before using direct OpenAI renderers.")
  }
}

function assertKieAuth() {
  if (!process.env.KIE_API_KEY) {
    throw new Error("Missing KIE_API_KEY. Set it in .env.local or Vercel env before using Kie renderers.")
  }
}

function isKieRenderer(renderer: Renderer) {
  return (
    renderer === "kie-gpt-image-2" ||
    renderer === "kie-gpt-image-2-composite" ||
    renderer === "kie-nano-banana-2" ||
    renderer === "kie-nano-banana-2-composite"
  )
}

function isKieCompositeRenderer(renderer: Renderer) {
  return renderer === "kie-gpt-image-2-composite" || renderer === "kie-nano-banana-2-composite"
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
  if (visual.id.includes("terminology")) {
    return `
      <g transform="translate(905 84)">
        <rect x="0" y="0" width="282" height="244" rx="34" fill="#ffffff" opacity="0.9" stroke="${palette.light}" stroke-width="2"/>
        <path d="M64 122 H220" stroke="${palette.mid}" stroke-width="10" stroke-linecap="round" opacity="0.82"/>
        <path d="M142 58 V186" stroke="${palette.mid}" stroke-width="10" stroke-linecap="round" opacity="0.82"/>
        <rect x="34" y="38" width="88" height="64" rx="18" fill="${palette.light}" stroke="${palette.dark}" stroke-width="4"/>
        <rect x="160" y="38" width="88" height="64" rx="18" fill="#ffffff" stroke="${palette.mid}" stroke-width="4"/>
        <rect x="34" y="142" width="88" height="64" rx="18" fill="#ffffff" stroke="${palette.mid}" stroke-width="4"/>
        <rect x="160" y="142" width="88" height="64" rx="18" fill="${palette.light}" stroke="${palette.dark}" stroke-width="4"/>
        <circle cx="142" cy="122" r="22" fill="${palette.dark}"/>
      </g>
    `
  }

  if (visual.id.includes("certificate-detail")) {
    return `
      <g transform="translate(906 84)">
        <rect x="0" y="0" width="282" height="244" rx="34" fill="#ffffff" opacity="0.9" stroke="${palette.light}" stroke-width="2"/>
        <rect x="58" y="36" width="126" height="168" rx="18" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
        <path d="M84 78 H160 M84 112 H156 M84 146 H142" stroke="#ffffff" stroke-width="9" stroke-linecap="round"/>
        <circle cx="188" cy="154" r="42" fill="#ffffff" stroke="${palette.dark}" stroke-width="8"/>
        <path d="M218 184 L248 214" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round"/>
        <circle cx="104" cy="180" r="14" fill="${palette.dark}"/>
      </g>
    `
  }

  if (visual.id.includes("privacy-diagnosis")) {
    return `
      <g transform="translate(906 84)">
        <rect x="0" y="0" width="282" height="244" rx="34" fill="#ffffff" opacity="0.9" stroke="${palette.light}" stroke-width="2"/>
        <rect x="34" y="48" width="96" height="150" rx="24" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
        <rect x="152" y="48" width="96" height="150" rx="24" fill="#ffffff" stroke="${palette.mid}" stroke-width="4"/>
        <path d="M58 96 H108 M58 126 H104" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
        <path d="M174 96 H226 M174 126 H216 M174 156 H224" stroke="${palette.light}" stroke-width="8" stroke-linecap="round"/>
        <path d="M134 62 V194" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" opacity="0.82"/>
        <path d="M116 126 L134 146 L166 100" fill="none" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    `
  }

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
  const labelsOnly = visual.textMode === "labels"
  const yStart = labelsOnly ? 660 : 590
  const cardHeight = labelsOnly ? 126 : 154
  const step = labelsOnly ? 154 : 172
  return visual.items
    .slice(0, 4)
    .map((item, index) =>
      renderItemCard(item, index, 120, yStart + index * step, 1040, cardHeight, palette, { showDetail: !labelsOnly }),
    )
    .join("")
}

function renderComparisonMap(visual: ArticleVisual, palette: Palette) {
  const items = visual.items.slice(0, 4)
  const labelsOnly = visual.textMode === "labels"
  const yStart = labelsOnly ? 660 : 590
  const cardHeight = labelsOnly ? 126 : 154
  const step = labelsOnly ? 154 : 172
  return items
    .map((item, index) => {
      const y = yStart + index * step
      return renderItemCard(item, index, 120, y, 1040, cardHeight, palette, { showDetail: !labelsOnly })
    })
    .join("")
}

function renderWarningMap(visual: ArticleVisual, palette: Palette) {
  const [first, ...rest] = visual.items
  const labelsOnly = visual.textMode === "labels"
  const primary = first
    ? renderItemCard(first, 0, 120, labelsOnly ? 650 : 620, 1040, labelsOnly ? 126 : 180, palette, {
        showDetail: !labelsOnly,
      })
    : ""
  const secondary = rest
    .slice(0, 3)
    .map((item, index) =>
      renderItemCard(
        item,
        index + 1,
        120,
        (labelsOnly ? 804 : 820) + index * (labelsOnly ? 154 : 174),
        1040,
        labelsOnly ? 126 : 156,
        palette,
        { showDetail: !labelsOnly },
      ),
    )
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

  if (visual.articleType === "policy") {
    return [
      "Art direction: premium public-service systems diagram with clear route lines, abstract care nodes, signal checks, colour-zoned boundaries, and calm clinical texture.",
      "Make the hierarchy specific and readable through pathways, decision thresholds, and governance checkpoints. Do not use anatomy, X-rays, scan fragments, body silhouettes, patient faces, doctor portraits, clinical-room scenes, or dense editorial collage unless the individual prompt explicitly asks for them.",
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

function getApprovedVisibleLabels(visual: ArticleVisual): string[] {
  if (visual.textItems?.length) return visual.textItems
  return visual.items.map((item) => item.label)
}

function getArticleVisualContext(visual: ArticleVisual): string {
  return [
    visual.articleType ? `Article archetype: ${visual.articleType}.` : null,
    visual.visualRole ? `Visual role: ${visual.visualRole}.` : null,
    visual.concept ? `Concept to teach at a glance: ${visual.concept}` : null,
  ].filter(Boolean).join("\n")
}

function getTextPlanPrompt(visual: ArticleVisual, _format: VisualFormat): string {
  // gpt-image-2 renders text accurately, so this is a TEACHING infographic that
  // should contain legible, informative text. All visible text is drawn ONLY from
  // the registry (eyebrow, title, and each item's label + detail) so it stays
  // controlled and accurate — the model must not invent copy. The same labels also
  // render in React/HTML via components/blog/article-visuals.tsx for accessibility.
  if (visual.textMode === "labels" || visual.textMode === "title-and-labels") {
    const labelLines = getApprovedVisibleLabels(visual)
      .map((label) => `- "${label}"`)
      .join("\n")

    return [
      "Visible text plan: this teaching infographic should contain only a short headline and the approved short labels below. Do not include paragraph text, explanatory callouts, tables, figures, prices, dates, source names, footers, or invented microcopy inside the generated image.",
      `Kicker / eyebrow (small, above or near the headline): "${visual.eyebrow}"`,
      `Headline (most prominent text): "${visual.title}"`,
      "Approved visible labels:",
      labelLines,
      "Hard text rules:",
      "- Use ONLY the exact wording provided above. Do NOT render item detail text or invent extra headings, statistics, prices, percentages, dates, drug or brand names, legal claims, source names, captions, footers, or calls to action.",
      "- Spell every word correctly and exactly as written.",
      "- Keep the image readable at article width. The article HTML carries the detailed explanation.",
      "- No fake document body text, no fake UI text, no fake form fields, no signatures, no fake percentages or chart numbers.",
    ].join("\n")
  }

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
    getArticleVisualContext(visual),
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
  const isPolicyUnderlay = visual.articleType === "policy"

  const underlayDirection = isPolicyUnderlay
    ? [
        "Your job is the background art field only. A production script will overlay the final title, labels, diagram modules, footer text, and official brand badge after generation.",
        "Create a calm, premium public-health diagram underlay: matte colour fields, subtle route lines, quiet signal nodes, soft risk zones, print grain, and low-contrast technical texture.",
        "Do not create a finished infographic. Do not draw cards, headings, section labels, legends, UI panels, dashboards, document pages, people, faces, anatomy, X-rays, scans, or any object that asks for text.",
        "Composition requirement: keep the centre and lower-middle visually useful but restrained, with enough quiet space for deterministic overlay labels. Prefer three to five broad shapes over a dense collage.",
        "Style requirement: editorial and authored, not Canva, SaaS clip art, or decorative stock. Avoid beige emptiness, childish icons, fake app screens, and clutter.",
      ].join("\n")
    : [
        "Your job is the image field only. A production script will overlay all approved article copy, cards, footer text, and the official brand badge after generation.",
        "Create an article-specific educational visual underlay using unlabeled diagrams, process arrows, comparison zones, warning hierarchy, texture, clinical iconography, and practical objects only when they teach the topic. Use body or anatomy shapes only when the individual article prompt explicitly requires anatomy.",
        "Boring-output rejection rule: a simple phone, simple lung, door, checklist card, flag, single warning icon, isolated body silhouette, soft pastel blob, or two-to-three-symbol composition is an automatic failure. Do not make polite health-tech clip art.",
        "Composition requirement: fill the portrait canvas with at least 7 distinct visual clusters, strong foreground/midground/background depth, diagonal or radial movement, and dense article-specific clinical cues around the overlay-safe areas. The viewer should feel there is useful visual information at the edges, behind the title area, and between the copy cards.",
        "Style requirement: premium editorial, tactile, layered, specific, and memorable. Use richer contrast, controlled saturation, print grain, route lines, risk zones, and overlapping panels. Use cutaway anatomy only when the article prompt explicitly requires anatomy. Avoid beige emptiness and washed-out minimalism.",
      ].join("\n")

  return [
    `Use case: ${format}`,
    "Asset type: text-free underlay for a portrait health-guide visual on a premium Australian digital health website.",
    `Model: ${GPT_IMAGE_MODEL}.`,
    "",
    "Primary visual subject:",
    cleanedPrimaryRequest,
    getArticleVisualContext(visual),
    "",
    getVisualFormatPrompt(format),
    getInfographicLayoutPrompt(visual.kind),
    getArtDirectionPrompt(slug, visual, format, styleShift),
    "",
    underlayDirection,
    "Hard visible-text rule: no readable words, letters, numbers, tables, fake UI, fake forms, captions, labels, badges, stamps, signatures, handwriting, prescription text, chart labels, or signage. The final asset must contain zero generated text.",
    "Avoid generic stock art, blank phone hero, blank document hero, medicine-box hero, desk flat lay, balance-scale metaphors, scenic landscapes, road/path metaphors, clinic-door metaphors, mountains, beaches, coastlines, ocean, city skylines, Australian maps, flags, landmarks, and decorative abstract blobs. The underlay still needs to be specific to the article.",
    "No identifiable people, no fake doctor faces, no doctor-patient consultation scene, no medical crosses, no pharmacy cross signs, no plus-sign shop signs, no pills, no tablets, no capsules, no pill blister packs, no medicine bottles as focal objects, no official seals, no logos, no medication brand names, no pill imprints, no gore, no graphic symptoms, no consultation CTA.",
    "Leave the bottom-right 320 by 110 pixel area calm and low-detail for the production badge overlay.",
    "Article context: patient education visual. Do not render or infer website names, slug text, or article metadata.",
    `Style retry seed for context only: ${styleShift}.`,
  ].join("\n")
}

function buildKiePrompt(
  slug: string,
  visual: ArticleVisual,
  renderer: KieDirectRenderer,
  styleShift = 0,
): string {
  const format = visual.visualFormat ?? getDefaultVisualFormat(visual.kind)
  const modelName = renderer === "kie-gpt-image-2" ? "GPT Image 2" : "Nano Banana 2"
  const cleanedPrimaryRequest = sanitizeImagePrompt(visual.imagePrompt)
  const assetShape = visual.layout === "wide" ? "wide 16:9" : "portrait 3:4"

  return [
    `Create a finished ${assetShape} patient-education diagram using ${modelName}.`,
    `Use case: ${format}.`,
    "Primary request:",
    cleanedPrimaryRequest,
    getArticleVisualContext(visual),
    "",
    getVisualFormatPrompt(format),
    getInfographicLayoutPrompt(visual.kind),
    getArtDirectionPrompt(slug, visual, format, styleShift),
    "",
    "Quality bar:",
    "- Make it look like a proper patient handout or medical-education diagram, not a decorative poster.",
    "- It must teach one clear idea from this article at a glance through pathway logic, timelines, decision boundaries, mechanism diagrams, or anatomy only when the article prompt explicitly asks for anatomy.",
    "- Use clear diagram structure, exact labels, directional arrows, visual comparison logic, and generous spacing. Do not add anatomy, body parts, skin cutaways, organs, X-rays, or scans unless the individual article prompt explicitly requires them.",
    "- The visual information should be useful even if the reader only scans it for five seconds.",
    "- Avoid sterile SaaS illustration, generic stock art, desk flat lays, medicine boxes, pills, blank documents, phone mockups, warning icon rows, abstract blob decoration, lifestyle filler, scenic Australia, or anything reusable across unrelated articles.",
    "",
    getTextPlanPrompt(visual, format),
    "Important text rule: render the headline and every approved visible label exactly. If a label is hard to render, simplify the surrounding art instead of changing the wording.",
    "Do not render any footer, signature, watermark, logo, tiny caption, invented brand mark, pseudo-word, or decorative text anywhere in the image. Keep the bottom-right blank or visually calm.",
    "",
    "Medical and compliance constraints:",
    "- No product packaging, no pill imprints, no medication brand names, no official seals, no medical crosses, no gore, no before/after claims, no efficacy ranking, no consultation CTA, no website UI, no fake doctor chat, no pseudo-branding, and no service logo.",
    "- If people appear, make them anonymous, secondary, and non-identifiable.",
    "- Leave the bottom-right corner completely free of text, badges, marks, icons, signatures, and focal content.",
    "Article context: patient education visual. Do not render or infer website names, slug text, URLs, source names, prices, dates, statistics, or article metadata.",
    `Style retry seed for context only: ${styleShift}.`,
  ].join("\n")
}

function buildKieCompositeUnderlayPrompt(slug: string, visual: ArticleVisual, renderer: KieRenderer, styleShift = 0): string {
  const modelName = renderer.startsWith("kie-gpt-image-2") ? "GPT Image 2" : "Nano Banana 2"
  const assetShape = visual.layout === "wide" ? "wide 16:9" : "portrait 3:4"

  return [
    buildGatewayCompositeUnderlayPrompt(slug, visual, styleShift)
      .replace("Asset type: text-free underlay for a portrait health-guide visual", `Asset type: text-free underlay for a ${assetShape} health-guide visual`)
      .replace(`Model: ${GPT_IMAGE_MODEL}.`, `Model: ${modelName}.`),
    "",
    "Extra hard rule for this Kie run: absolutely no visible text, letters, numbers, labels, captions, watermarks, logos, pseudo-words, signatures, brand names, footer text, badges, UI text, anatomical labels, or placeholder copy. Make the underlay visually rich using only diagrams, colour zones, arrows, textures, silhouettes, and unlabeled clinical motifs.",
    "Do not show genital anatomy, explicit sexual imagery, pregnancy silhouettes, medication products, pills, blister packs, gore, wounds, distressed people, or identifiable faces.",
    "Leave the bottom-right corner calm and empty for the production badge.",
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

function isTelehealthPolicyCompositeVisual(visual: ArticleVisual): boolean {
  return (
    visual.id === "telehealth-definition-map" ||
    visual.id === "telehealth-care-workflow" ||
    visual.id === "telehealth-suitability-boundary" ||
    visual.id === "telehealth-consultation-clinical-flow" ||
    visual.id === "telehealth-consultation-channel-map" ||
    visual.id === "telehealth-consultation-fit" ||
    visual.id === "telehealth-best-fit-map" ||
    visual.id === "telehealth-do-not-use-map" ||
    visual.id === "telehealth-care-route-map" ||
    visual.id === "first-telehealth-prep-map" ||
    visual.id === "first-telehealth-what-happens" ||
    visual.id === "first-telehealth-aftercare-map"
  )
}

function renderCompositeUnderlayWashSvg(visual: ArticleVisual): string {
  const palette = palettes[visual.accent]
  const strongWash = visual.visualFormat === "red-flag-warning" || visual.kind === "warning"
  const glowStops = strongWash
    ? { start: "0.74", middle: "0.82", end: "0.90", fadeStart: "0.72", fadeMiddle: "0.78", fadeEnd: "0.86", solid: "0.34" }
    : { start: "0.46", middle: "0.56", end: "0.70", fadeStart: "0.42", fadeMiddle: "0.50", fadeEnd: "0.68", solid: "0.12" }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <radialGradient id="washGlow" cx="72%" cy="40%" r="76%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="${glowStops.start}"/>
          <stop offset="46%" stop-color="${palette.wash}" stop-opacity="${glowStops.middle}"/>
          <stop offset="100%" stop-color="${palette.light}" stop-opacity="${glowStops.end}"/>
        </radialGradient>
        <linearGradient id="washFade" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="${glowStops.fadeStart}"/>
          <stop offset="58%" stop-color="${palette.wash}" stop-opacity="${glowStops.fadeMiddle}"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="${glowStops.fadeEnd}"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#washGlow)"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#washFade)"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.wash}" fill-opacity="${glowStops.solid}"/>
    </svg>
  `
}

function renderMiniGlyph(kind: "video" | "phone" | "form" | "review" | "identity" | "consent" | "history" | "outcome", x: number, y: number, palette: Palette) {
  if (kind === "video") {
    return `
      <rect x="${x}" y="${y}" width="74" height="54" rx="16" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
      <path d="M${x + 30} ${y + 17} L${x + 30} ${y + 38} L${x + 49} ${y + 27} Z" fill="${palette.dark}" opacity="0.88"/>
    `
  }

  if (kind === "phone") {
    return `
      <path d="M${x + 18} ${y + 12} C${x + 2} ${y + 34} ${x + 10} ${y + 66} ${x + 42} ${y + 80} C${x + 56} ${y + 86} ${x + 72} ${y + 82} ${x + 80} ${y + 68} L${x + 62} ${y + 55} C${x + 56} ${y + 61} ${x + 50} ${y + 62} ${x + 42} ${y + 58} C${x + 30} ${y + 52} ${x + 25} ${y + 40} ${x + 29} ${y + 29} C${x + 31} ${y + 21} ${x + 36} ${y + 16} ${x + 43} ${y + 12} L${x + 28} ${y - 2} C${x + 24} ${y + 1} ${x + 21} ${y + 6} ${x + 18} ${y + 12} Z" fill="${palette.mid}" opacity="0.86"/>
      <path d="M${x + 68} ${y + 12} C${x + 84} ${y + 28} ${x + 91} ${y + 48} ${x + 84} ${y + 70}" fill="none" stroke="${palette.dark}" stroke-width="5" stroke-linecap="round" opacity="0.42"/>
    `
  }

  if (kind === "form") {
    return `
      <rect x="${x + 10}" y="${y}" width="70" height="84" rx="16" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
      <path d="M${x + 28} ${y + 26} H${x + 62} M${x + 28} ${y + 44} H${x + 58} M${x + 28} ${y + 62} H${x + 52}" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
      <circle cx="${x + 70}" cy="${y + 66}" r="18" fill="${palette.dark}"/>
      <path d="M${x + 61} ${y + 66} L${x + 69} ${y + 74} L${x + 82} ${y + 56}" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    `
  }

  if (kind === "review") {
    return `
      <circle cx="${x + 44}" cy="${y + 44}" r="42" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
      <path d="M${x + 18} ${y + 45} H${x + 70}" stroke="${palette.dark}" stroke-width="7" stroke-linecap="round"/>
      <path d="M${x + 45} ${y + 20} V${y + 70}" stroke="${palette.dark}" stroke-width="7" stroke-linecap="round" opacity="0.42"/>
      <circle cx="${x + 44}" cy="${y + 44}" r="12" fill="${palette.dark}"/>
    `
  }

  if (kind === "identity") {
    return `
      <rect x="${x + 8}" y="${y + 6}" width="78" height="64" rx="18" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
      <circle cx="${x + 36}" cy="${y + 34}" r="11" fill="${palette.dark}" opacity="0.82"/>
      <path d="M${x + 21} ${y + 58} C${x + 26} ${y + 46} ${x + 47} ${y + 46} ${x + 52} ${y + 58}" fill="none" stroke="${palette.dark}" stroke-width="5" stroke-linecap="round" opacity="0.82"/>
      <path d="M${x + 60} ${y + 30} H${x + 74} M${x + 60} ${y + 48} H${x + 76}" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    `
  }

  if (kind === "consent") {
    return `
      <circle cx="${x + 44}" cy="${y + 42}" r="39" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
      <path d="M${x + 25} ${y + 43} L${x + 40} ${y + 58} L${x + 66} ${y + 26}" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    `
  }

  if (kind === "history") {
    return `
      <path d="M${x + 12} ${y + 28} C${x + 28} ${y + 6} ${x + 62} ${y + 6} ${x + 78} ${y + 28} C${x + 92} ${y + 48} ${x + 80} ${y + 78} ${x + 44} ${y + 84} C${x + 8} ${y + 78} ${x - 4} ${y + 48} ${x + 12} ${y + 28} Z" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
      <path d="M${x + 24} ${y + 35} H${x + 66} M${x + 28} ${y + 52} H${x + 62} M${x + 35} ${y + 68} H${x + 55}" stroke="${palette.dark}" stroke-width="5" stroke-linecap="round" opacity="0.78"/>
    `
  }

  return `
    <path d="M${x + 18} ${y + 18} H${x + 74} V${y + 72} H${x + 18} Z" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M${x + 30} ${y + 45} L${x + 42} ${y + 57} L${x + 66} ${y + 29}" fill="none" stroke="${palette.dark}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${x + 76} ${y + 44} H${x + 104}" stroke="${palette.dark}" stroke-width="6" stroke-linecap="round" opacity="0.42"/>
  `
}

function renderTelehealthNode(label: string, x: number, y: number, width: number, palette: Palette, glyph: string, index: number) {
  const text = textBlock({
    text: label,
    x: x + 112,
    y: y + 58,
    width: width - 138,
    size: 28,
    weight: 850,
    color: palette.text,
    maxLines: 2,
  })

  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="126" rx="28" fill="#ffffff" fill-opacity="0.82" stroke="${palette.light}" stroke-width="2"/>
      <circle cx="${x + 58}" cy="${y + 63}" r="37" fill="${palette.wash}" stroke="${palette.light}" stroke-width="2"/>
      ${glyph}
      <circle cx="${x + width - 36}" cy="${y + 34}" r="18" fill="${palette.dark}" opacity="0.92"/>
      <text x="${x + width - 42}" y="${y + 43}" font-family="${SVG_FONT_FAMILY}" font-size="22" font-weight="900" fill="#ffffff">${index}</text>
      ${text.svg}
    </g>
  `
}

function renderTelehealthDefinitionBody(visual: ArticleVisual, palette: Palette): string {
  const [video, phone, secureForm, clinicalReview] = getApprovedVisibleLabels(visual)

  return `
    <g>
      <path d="M246 728 C418 628 828 628 1010 728 C1120 790 1118 970 1010 1034 C828 1144 418 1144 246 1034 C138 970 138 790 246 728 Z" fill="#ffffff" fill-opacity="0.70" stroke="${palette.light}" stroke-width="2"/>
      <path d="M372 792 C478 714 800 714 908 792" fill="none" stroke="${palette.mid}" stroke-width="16" stroke-linecap="round" opacity="0.18"/>
      <path d="M372 976 C478 1054 800 1054 908 976" fill="none" stroke="${palette.dark}" stroke-width="12" stroke-linecap="round" opacity="0.14"/>
      <circle cx="640" cy="884" r="142" fill="${palette.dark}" opacity="0.94"/>
      <circle cx="640" cy="884" r="184" fill="none" stroke="${palette.mid}" stroke-width="4" opacity="0.24"/>
      <path d="M640 700 V584 M426 803 L306 722 M426 965 L306 1048 M854 884 H1002" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" opacity="0.25"/>
      <circle cx="640" cy="884" r="54" fill="#ffffff" opacity="0.20"/>
      <circle cx="640" cy="884" r="18" fill="#ffffff" opacity="0.92"/>
      <circle cx="582" cy="842" r="13" fill="#ffffff" opacity="0.72"/>
      <circle cx="702" cy="842" r="13" fill="#ffffff" opacity="0.72"/>
      <circle cx="582" cy="930" r="13" fill="#ffffff" opacity="0.72"/>
      <circle cx="702" cy="930" r="13" fill="#ffffff" opacity="0.72"/>
      <path d="M595 850 C618 868 622 874 640 884 C658 874 662 868 689 850 M595 922 C618 902 622 895 640 884 C658 895 662 902 689 922" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.74"/>
      ${renderTelehealthNode(video, 132, 612, 360, palette, renderMiniGlyph("video", 158, 640, palette), 1)}
      ${renderTelehealthNode(phone, 132, 1016, 360, palette, renderMiniGlyph("phone", 158, 1038, palette), 2)}
      ${renderTelehealthNode(secureForm, 788, 612, 390, palette, renderMiniGlyph("form", 814, 633, palette), 3)}
      ${renderTelehealthNode(clinicalReview, 788, 1016, 390, palette, renderMiniGlyph("review", 818, 1036, palette), 4)}
    </g>
  `
}

function renderTelehealthWorkflowBody(visual: ArticleVisual, palette: Palette): string {
  const labels = getApprovedVisibleLabels(visual)
  const glyphKinds: Array<"identity" | "consent" | "history" | "outcome"> = ["identity", "consent", "history", "outcome"]
  const nodes = labels
    .slice(0, 4)
    .map((label, index) => {
      const x = 150 + index * 264

      return `
        <g>
          <circle cx="${x + 48}" cy="846" r="82" fill="#ffffff" fill-opacity="0.86" stroke="${palette.light}" stroke-width="3"/>
          <circle cx="${x + 48}" cy="846" r="98" fill="none" stroke="${palette.mid}" stroke-width="3" opacity="0.20"/>
          ${renderMiniGlyph(glyphKinds[index], x + 2, 802, palette)}
          <circle cx="${x + 48}" cy="952" r="24" fill="${palette.dark}"/>
          <text x="${x + 41}" y="961" font-family="${SVG_FONT_FAMILY}" font-size="24" font-weight="900" fill="#ffffff">${index + 1}</text>
          <text x="${x + 48}" y="1020" text-anchor="middle" font-family="${SVG_FONT_FAMILY}" font-size="28" font-weight="850" fill="${palette.text}">${escapeXml(label)}</text>
        </g>
      `
    })
    .join("")

  return `
    <g>
      <rect x="92" y="646" width="1096" height="548" rx="44" fill="#ffffff" fill-opacity="0.42" stroke="${palette.light}" stroke-width="2"/>
      <path d="M198 846 H1042" stroke="${palette.mid}" stroke-width="18" stroke-linecap="round" opacity="0.20"/>
      <path d="M198 846 H1042" stroke="${palette.dark}" stroke-width="5" stroke-linecap="round" opacity="0.35" stroke-dasharray="1 34"/>
      <path d="M1002 846 L1060 846 M1032 816 L1062 846 L1032 876" fill="none" stroke="${palette.dark}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="0.62"/>
      <path d="M842 936 C934 1004 1008 1026 1104 1002" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.28"/>
      <path d="M1104 1002 L1074 980 M1104 1002 L1078 1032" fill="none" stroke="${palette.mid}" stroke-width="7" stroke-linecap="round" opacity="0.34"/>
      ${nodes}
    </g>
  `
}

function renderTelehealthBoundaryBody(visual: ArticleVisual, palette: Palette): string {
  const labels = getApprovedVisibleLabels(visual)
  const laneColours = [
    { fill: "#dcfce7", stroke: "#16a34a", text: "#166534" },
    { fill: "#fef3c7", stroke: "#d97706", text: "#92400e" },
    { fill: "#ffe4e6", stroke: "#e11d48", text: "#9f1239" },
    { fill: "#fecdd3", stroke: "#be123c", text: "#881337" },
  ]
  const lanes = labels
    .slice(0, 4)
    .map((label, index) => {
      const x = 100 + index * 270
      const colour = laneColours[index]
      const labelBlock = textBlock({
        text: label,
        x: x + 34,
        y: 1030,
        width: 202,
        size: 27,
        weight: 900,
        color: colour.text,
        maxLines: 2,
      })
      const symbol =
        index === 0
          ? `<path d="M${x + 88} 846 L${x + 118} 878 L${x + 182} 790" fill="none" stroke="${colour.stroke}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`
          : index === 3
            ? `<path d="M${x + 135} 792 L${x + 196} 902 H${x + 74} Z" fill="#ffffff" fill-opacity="0.52" stroke="${colour.stroke}" stroke-width="7"/><path d="M${x + 135} 824 V868 M${x + 135} 892 V894" stroke="${colour.stroke}" stroke-width="10" stroke-linecap="round"/>`
            : `<path d="M${x + 72} 850 H${x + 188}" stroke="${colour.stroke}" stroke-width="12" stroke-linecap="round"/><path d="M${x + 148} 812 L${x + 188} 850 L${x + 148} 888" fill="none" stroke="${colour.stroke}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`

      return `
        <g>
          <rect x="${x}" y="688" width="270" height="478" fill="${colour.fill}" fill-opacity="${index === 0 ? "0.68" : index === 1 ? "0.64" : "0.58"}"/>
          <path d="M${x + 34} 744 H${x + 226}" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.45"/>
          <path d="M${x + 34} 1138 H${x + 226}" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.45"/>
          ${index > 0 ? `<path d="M${x} 706 V1148" stroke="#ffffff" stroke-width="4" opacity="0.60"/>` : ""}
          ${symbol}
          ${labelBlock.svg}
        </g>
      `
    })
    .join("")

  return `
    <g>
      <defs>
        <clipPath id="telehealthBoundaryClip">
          <rect x="100" y="688" width="1080" height="478" rx="42"/>
        </clipPath>
      </defs>
      <rect x="100" y="688" width="1080" height="478" rx="42" fill="#ffffff" fill-opacity="0.52" stroke="${palette.light}" stroke-width="2"/>
      <g clip-path="url(#telehealthBoundaryClip)">
        ${lanes}
      </g>
      <rect x="100" y="688" width="1080" height="478" rx="42" fill="none" stroke="${palette.dark}" stroke-width="3" opacity="0.12"/>
      <path d="M226 1248 C416 1168 594 1304 778 1212 C920 1140 1036 1184 1158 1118" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" opacity="0.20"/>
      <path d="M1128 1092 L1160 1118 L1120 1134" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.25"/>
    </g>
  `
}

function renderTelehealthBodyLabel(label: string, x: number, y: number, width: number, palette: Palette, size = 27) {
  const labelBlock = textBlock({
    text: label,
    x,
    y,
    width,
    size,
    weight: 900,
    color: palette.text,
    lineHeight: Math.round(size * 1.2),
    maxLines: 2,
  })

  return labelBlock.svg
}

function renderFirstTelehealthPrepBody(visual: ArticleVisual, palette: Palette): string {
  const [timeline, medicines, readings, question] = getApprovedVisibleLabels(visual)

  return `
    <g>
      <rect x="78" y="610" width="1124" height="720" rx="52" fill="#ffffff" fill-opacity="0.66" stroke="${palette.light}" stroke-width="2"/>
      <path d="M210 910 C342 1042 460 990 586 1076 C720 1168 874 1086 1014 1210" fill="none" stroke="${palette.mid}" stroke-width="18" stroke-linecap="round" opacity="0.15"/>
      <path d="M244 875 C370 1000 502 998 622 1084" fill="none" stroke="${palette.dark}" stroke-width="6" stroke-linecap="round" opacity="0.25"/>
      <path d="M668 1084 C804 996 940 1040 1044 1180" fill="none" stroke="${palette.dark}" stroke-width="6" stroke-linecap="round" opacity="0.20"/>

      <rect x="118" y="670" width="326" height="276" rx="34" fill="#ffffff" fill-opacity="0.88" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(timeline, 150, 724, 260, palette)}
      <path d="M154 862 H402" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>
      <path d="M170 862 C202 812 246 836 284 782 C320 730 372 762 404 716" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="170" cy="862" r="11" fill="${palette.dark}"/>
      <circle cx="284" cy="782" r="11" fill="${palette.mid}"/>
      <circle cx="404" cy="716" r="11" fill="${palette.dark}"/>
      <path d="M162 902 H228 M252 902 H310 M334 902 H394" stroke="${palette.mid}" stroke-width="7" stroke-linecap="round" opacity="0.50"/>

      <rect x="480" y="642" width="318" height="304" rx="34" fill="#ffffff" fill-opacity="0.88" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(medicines, 512, 704, 250, palette)}
      <rect x="528" y="782" width="222" height="36" rx="18" fill="${palette.light}" opacity="0.92"/>
      <rect x="528" y="836" width="174" height="36" rx="18" fill="${palette.light}" opacity="0.74"/>
      <rect x="528" y="890" width="198" height="36" rx="18" fill="${palette.light}" opacity="0.56"/>
      <circle cx="722" cy="823" r="50" fill="#ffffff" fill-opacity="0.74" stroke="${palette.mid}" stroke-width="5"/>
      <path d="M690 808 C708 788 736 790 752 812 C734 844 710 846 690 824" fill="none" stroke="${palette.dark}" stroke-width="7" stroke-linecap="round" opacity="0.58"/>
      <circle cx="722" cy="821" r="10" fill="${palette.dark}" opacity="0.72"/>
      <path d="M724 870 C758 902 780 930 782 968" fill="none" stroke="${palette.mid}" stroke-width="7" stroke-linecap="round" opacity="0.42"/>

      <rect x="834" y="670" width="326" height="276" rx="34" fill="#ffffff" fill-opacity="0.88" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(readings, 866, 724, 254, palette)}
      <circle cx="930" cy="838" r="56" fill="${palette.light}" opacity="0.88"/>
      <path d="M930 838 L960 808" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round"/>
      <path d="M898 872 A48 48 0 1 1 963 872" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round"/>
      <rect x="1016" y="786" width="94" height="110" rx="24" fill="#ffffff" stroke="${palette.mid}" stroke-width="5"/>
      <circle cx="1063" cy="826" r="18" fill="${palette.dark}" opacity="0.72"/>
      <path d="M1038 868 H1088" stroke="${palette.light}" stroke-width="9" stroke-linecap="round"/>

      <path d="M282 946 C360 1006 430 1042 520 1074" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.42"/>
      <path d="M638 946 C638 1006 626 1044 610 1082" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.42"/>
      <path d="M996 946 C904 1006 790 1048 668 1080" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.42"/>

      <circle cx="612" cy="1110" r="112" fill="${palette.dark}" fill-opacity="0.94"/>
      <circle cx="612" cy="1110" r="154" fill="none" stroke="${palette.mid}" stroke-width="5" opacity="0.30"/>
      <circle cx="612" cy="1110" r="44" fill="#ffffff" opacity="0.16"/>
      <circle cx="612" cy="1110" r="11" fill="#ffffff" opacity="0.92"/>
      <path d="M574 1086 C596 1068 628 1068 650 1086 M574 1134 C596 1154 628 1154 650 1134" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.62"/>
      <path d="M560 1110 H586 M638 1110 H664 M612 1058 V1084 M612 1136 V1162" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.42"/>
      <path d="M438 1260 C500 1214 552 1200 612 1200 C680 1200 738 1218 804 1260" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.32"/>
      <rect x="420" y="1228" width="398" height="82" rx="28" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(question, 472, 1281, 300, palette, 30)}
    </g>
  `
}

function renderFirstTelehealthRouteBody(visual: ArticleVisual, palette: Palette): string {
  const [submit, review, outcome, redirect] = getApprovedVisibleLabels(visual)

  return `
    <g>
      <rect x="82" y="610" width="1116" height="724" rx="52" fill="#ffffff" fill-opacity="0.66" stroke="${palette.light}" stroke-width="2"/>
      <path d="M206 994 H512" stroke="${palette.mid}" stroke-width="16" stroke-linecap="round" opacity="0.24"/>
      <path d="M768 994 C862 870 956 816 1086 782" fill="none" stroke="${palette.mid}" stroke-width="15" stroke-linecap="round" opacity="0.22"/>
      <path d="M768 994 C878 1058 970 1144 1088 1230" fill="none" stroke="#f06f8e" stroke-width="14" stroke-linecap="round" opacity="0.24"/>
      <path d="M196 994 H500" stroke="${palette.dark}" stroke-width="6" stroke-linecap="round" opacity="0.42"/>
      <path d="M760 994 C854 876 956 824 1080 790" fill="none" stroke="${palette.dark}" stroke-width="6" stroke-linecap="round" opacity="0.36"/>
      <path d="M760 994 C876 1064 970 1148 1084 1220" fill="none" stroke="#be3455" stroke-width="6" stroke-linecap="round" opacity="0.42"/>

      <rect x="124" y="812" width="260" height="362" rx="36" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      <circle cx="254" cy="908" r="58" fill="${palette.light}"/>
      <path d="M214 906 H294 M214 942 H278 M214 870 H302" stroke="#ffffff" stroke-width="9" stroke-linecap="round"/>
      <path d="M236 1008 H308 M204 1048 H300 M226 1088 H286" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.50"/>
      ${renderTelehealthBodyLabel(submit, 174, 1146, 168, palette, 31)}

      <circle cx="640" cy="994" r="142" fill="${palette.dark}" fill-opacity="0.95"/>
      <circle cx="640" cy="994" r="190" fill="none" stroke="${palette.mid}" stroke-width="5" opacity="0.24"/>
      <circle cx="640" cy="994" r="78" fill="#ffffff" opacity="0.13"/>
      <circle cx="640" cy="994" r="16" fill="#ffffff" opacity="0.88"/>
      <path d="M590 966 C618 940 672 940 700 966 M590 1022 C618 1048 672 1048 700 1022" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.58"/>
      <path d="M576 994 H612 M668 994 H704 M640 930 V966 M640 1022 V1058" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.36"/>
      <path d="M598 934 C626 908 676 908 704 934 M598 1054 C626 1080 676 1080 704 1054" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.50"/>
      <rect x="532" y="1162" width="220" height="78" rx="27" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(review, 592, 1214, 112, palette, 31)}

      <rect x="888" y="682" width="250" height="258" rx="36" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      <circle cx="1012" cy="784" r="56" fill="${palette.light}"/>
      <path d="M980 784 L1004 810 L1048 754" fill="none" stroke="${palette.dark}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M938 870 H1088" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.48"/>
      ${renderTelehealthBodyLabel(outcome, 936, 916, 160, palette, 30)}

      <rect x="878" y="1068" width="270" height="250" rx="36" fill="#fff1f2" fill-opacity="0.90" stroke="#fecdd3" stroke-width="2"/>
      <rect x="932" y="1144" width="164" height="76" rx="28" fill="#ffffff" fill-opacity="0.62" stroke="#be3455" stroke-width="6"/>
      <path d="M954 1182 H988 L1008 1158 L1034 1210 L1052 1182 H1074" fill="none" stroke="#be3455" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M958 1248 H1070" stroke="#be3455" stroke-width="8" stroke-linecap="round" opacity="0.58"/>
      ${renderTelehealthBodyLabel(redirect, 930, 1292, 170, palette, 30)}

      <path d="M384 994 L430 970 M384 994 L430 1018" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.34"/>
      <path d="M1080 790 L1044 772 M1080 790 L1058 824" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>
      <path d="M1084 1220 L1042 1214 M1084 1220 L1058 1186" fill="none" stroke="#be3455" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>
    </g>
  `
}

function renderFirstTelehealthAftercareBody(visual: ArticleVisual, palette: Palette): string {
  const [record, outcome, usualGp, urgentSigns] = getApprovedVisibleLabels(visual)

  return `
    <g>
      <rect x="78" y="610" width="1124" height="720" rx="52" fill="#ffffff" fill-opacity="0.66" stroke="${palette.light}" stroke-width="2"/>
      <path d="M218 850 C360 752 474 850 604 946 C744 1050 894 976 1042 844" fill="none" stroke="${palette.mid}" stroke-width="18" stroke-linecap="round" opacity="0.16"/>
      <path d="M354 1130 C506 1058 618 1194 760 1112 C886 1040 970 1080 1090 1198" fill="none" stroke="#f06f8e" stroke-width="15" stroke-linecap="round" opacity="0.14"/>
      <path d="M212 850 C354 758 476 846 602 946 C744 1058 894 982 1038 850" fill="none" stroke="${palette.dark}" stroke-width="6" stroke-linecap="round" opacity="0.32"/>
      <path d="M354 1130 C506 1058 618 1194 760 1112 C888 1040 972 1082 1086 1192" fill="none" stroke="#be3455" stroke-width="6" stroke-linecap="round" opacity="0.32"/>

      <rect x="124" y="694" width="288" height="288" rx="38" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      <rect x="190" y="758" width="120" height="154" rx="22" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
      <rect x="218" y="730" width="120" height="154" rx="22" fill="#ffffff" fill-opacity="0.82" stroke="${palette.mid}" stroke-width="4"/>
      <path d="M244 784 H314 M244 820 H304 M244 856 H292" stroke="${palette.light}" stroke-width="9" stroke-linecap="round"/>
      ${renderTelehealthBodyLabel(record, 204, 954, 130, palette, 30)}

      <circle cx="618" cy="972" r="122" fill="${palette.dark}" fill-opacity="0.95"/>
      <circle cx="618" cy="972" r="166" fill="none" stroke="${palette.mid}" stroke-width="5" opacity="0.24"/>
      <path d="M558 972 L598 1014 L684 908" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.90"/>
      <rect x="508" y="1118" width="226" height="78" rx="27" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(outcome, 564, 1170, 120, palette, 31)}

      <rect x="830" y="690" width="306" height="288" rx="38" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      <circle cx="982" cy="792" r="62" fill="${palette.light}"/>
      <path d="M940 794 C964 754 1004 750 1028 792 C1006 828 964 832 940 794 Z" fill="#ffffff" stroke="${palette.mid}" stroke-width="5"/>
      <circle cx="984" cy="792" r="17" fill="${palette.dark}" opacity="0.78"/>
      <path d="M916 894 C956 930 1014 932 1056 896" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.48"/>
      <path d="M1058 896 L1034 882 M1058 896 L1042 920" fill="none" stroke="${palette.mid}" stroke-width="7" stroke-linecap="round"/>
      ${renderTelehealthBodyLabel(usualGp, 902, 954, 176, palette, 30)}

      <rect x="840" y="1086" width="296" height="238" rx="38" fill="#fff1f2" fill-opacity="0.90" stroke="#fecdd3" stroke-width="2"/>
      <rect x="910" y="1144" width="154" height="76" rx="28" fill="#ffffff" fill-opacity="0.62" stroke="#be3455" stroke-width="6"/>
      <path d="M930 1182 H958 L982 1158 L1010 1210 L1028 1182 H1048" fill="none" stroke="#be3455" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M926 1248 H1052" stroke="#be3455" stroke-width="8" stroke-linecap="round" opacity="0.58"/>
      ${renderTelehealthBodyLabel(urgentSigns, 884, 1294, 210, palette, 29)}

      <path d="M412 842 L448 822 M412 842 L452 858" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.30"/>
      <path d="M1038 850 L998 840 M1038 850 L1014 884" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.32"/>
      <path d="M1086 1192 L1044 1186 M1086 1192 L1062 1158" fill="none" stroke="#be3455" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.40"/>
    </g>
  `
}

function renderWhenToUseTelehealthFitBody(visual: ArticleVisual, palette: Palette): string {
  const [history, lowRisk, followUp, redirect] = getApprovedVisibleLabels(visual)

  return `
    <g>
      <rect x="80" y="610" width="1120" height="720" rx="52" fill="#ffffff" fill-opacity="0.66" stroke="${palette.light}" stroke-width="2"/>
      <path d="M246 820 C376 704 514 776 640 940 C760 1098 904 1142 1054 1032" fill="none" stroke="${palette.mid}" stroke-width="18" stroke-linecap="round" opacity="0.16"/>
      <path d="M246 820 C376 704 514 776 640 940 C760 1098 904 1142 1054 1032" fill="none" stroke="${palette.dark}" stroke-width="6" stroke-linecap="round" opacity="0.28"/>
      <path d="M292 1096 C412 996 530 1056 640 940 C746 828 884 822 1004 718" fill="none" stroke="${palette.mid}" stroke-width="13" stroke-linecap="round" opacity="0.18"/>
      <path d="M292 1096 C412 996 530 1056 640 940 C746 828 884 822 1004 718" fill="none" stroke="${palette.dark}" stroke-width="5" stroke-linecap="round" opacity="0.22"/>

      <circle cx="640" cy="940" r="126" fill="${palette.dark}" fill-opacity="0.94"/>
      <circle cx="640" cy="940" r="178" fill="none" stroke="${palette.mid}" stroke-width="5" opacity="0.26"/>
      <circle cx="640" cy="940" r="18" fill="#ffffff" opacity="0.92"/>
      <path d="M582 904 C616 870 666 870 700 904 M582 976 C616 1012 666 1012 700 976" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.56"/>
      <path d="M552 940 H602 M678 940 H728 M640 852 V902 M640 978 V1028" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.36"/>

      <rect x="122" y="700" width="330" height="238" rx="36" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(history, 158, 760, 250, palette, 30)}
      <path d="M164 842 H372 M164 884 H326 M164 924 H358" stroke="${palette.mid}" stroke-width="9" stroke-linecap="round" opacity="0.44"/>
      <circle cx="384" cy="866" r="46" fill="${palette.light}" stroke="${palette.mid}" stroke-width="4"/>
      <path d="M358 866 H410" stroke="${palette.dark}" stroke-width="7" stroke-linecap="round" opacity="0.64"/>

      <rect x="828" y="662" width="318" height="240" rx="36" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(lowRisk, 870, 728, 220, palette, 30)}
      <path d="M886 820 C922 780 996 780 1034 820 C998 872 922 872 886 820 Z" fill="${palette.light}" stroke="${palette.mid}" stroke-width="5"/>
      <circle cx="960" cy="820" r="16" fill="${palette.dark}" opacity="0.76"/>
      <path d="M886 878 H1038" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.42"/>

      <rect x="142" y="1022" width="330" height="236" rx="36" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(followUp, 186, 1088, 230, palette, 30)}
      <path d="M214 1188 C260 1126 336 1126 384 1186" fill="none" stroke="${palette.mid}" stroke-width="10" stroke-linecap="round" opacity="0.62"/>
      <path d="M384 1186 L354 1172 M384 1186 L366 1218" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round"/>

      <rect x="820" y="1026" width="334" height="236" rx="36" fill="#ffffff" fill-opacity="0.90" stroke="${palette.light}" stroke-width="2"/>
      ${renderTelehealthBodyLabel(redirect, 866, 1092, 230, palette, 30)}
      <path d="M884 1190 H1038" stroke="${palette.mid}" stroke-width="12" stroke-linecap="round" opacity="0.46"/>
      <path d="M1008 1156 L1044 1190 L1008 1224" fill="none" stroke="${palette.dark}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/>
      <circle cx="884" cy="1190" r="18" fill="${palette.dark}" opacity="0.72"/>
    </g>
  `
}

function renderWhenToUseRouteChoiceBody(visual: ArticleVisual, palette: Palette): string {
  const labels = getApprovedVisibleLabels(visual)
  const lanes = [
    { fill: "#dcfce7", stroke: "#16a34a", text: "#166534" },
    { fill: "#e0f2fe", stroke: "#0284c7", text: "#075985" },
    { fill: "#fef3c7", stroke: "#d97706", text: "#92400e" },
    { fill: "#ffe4e6", stroke: "#be3455", text: "#9f1239" },
  ]
  const laneSvg = labels
    .slice(0, 4)
    .map((label, index) => {
      const x = 104 + index * 270
      const colour = lanes[index]
      const labelBlock = textBlock({
        text: label,
        x: x + 34,
        y: 1118,
        width: 202,
        size: 28,
        weight: 900,
        color: colour.text,
        maxLines: 2,
      })
      const mark =
        index === 0
          ? `<circle cx="${x + 135}" cy="842" r="68" fill="#ffffff" fill-opacity="0.56" stroke="${colour.stroke}" stroke-width="5"/><circle cx="${x + 135}" cy="842" r="15" fill="${colour.stroke}"/><path d="M${x + 90} 842 H${x + 116} M${x + 154} 842 H${x + 180}" stroke="${colour.stroke}" stroke-width="8" stroke-linecap="round" opacity="0.62"/>`
          : index === 1
            ? `<rect x="${x + 70}" y="770" width="130" height="124" rx="30" fill="#ffffff" fill-opacity="0.58" stroke="${colour.stroke}" stroke-width="5"/><path d="M${x + 100} 842 H${x + 170} M${x + 100} 878 H${x + 154} M${x + 100} 806 H${x + 176}" stroke="${colour.stroke}" stroke-width="8" stroke-linecap="round" opacity="0.70"/>`
            : index === 2
              ? `<circle cx="${x + 135}" cy="842" r="70" fill="#ffffff" fill-opacity="0.58" stroke="${colour.stroke}" stroke-width="5"/><path d="M${x + 135} 802 V848 L${x + 166} 872" stroke="${colour.stroke}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`
              : `<rect x="${x + 72}" y="802" width="130" height="76" rx="28" fill="#ffffff" fill-opacity="0.62" stroke="${colour.stroke}" stroke-width="6"/><path d="M${x + 94} 840 H${x + 122} L${x + 145} 812 L${x + 172} 866 L${x + 190} 840" fill="none" stroke="${colour.stroke}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`

      return `
        <g>
          <rect x="${x}" y="704" width="270" height="520" fill="${colour.fill}" fill-opacity="${index === 3 ? "0.52" : "0.60"}"/>
          <path d="M${x + 34} 748 H${x + 230}" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.42"/>
          <path d="M${x + 34} 1194 H${x + 230}" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.42"/>
          ${index > 0 ? `<path d="M${x} 724 V1200" stroke="#ffffff" stroke-width="4" opacity="0.60"/>` : ""}
          ${mark}
          ${labelBlock.svg}
        </g>
      `
    })
    .join("")

  return `
    <g>
      <defs>
        <clipPath id="routeChoiceClip">
          <rect x="104" y="704" width="1080" height="520" rx="44"/>
        </clipPath>
      </defs>
      <rect x="104" y="704" width="1080" height="520" rx="44" fill="#ffffff" fill-opacity="0.60" stroke="${palette.light}" stroke-width="2"/>
      <g clip-path="url(#routeChoiceClip)">
        ${laneSvg}
      </g>
      <rect x="104" y="704" width="1080" height="520" rx="44" fill="none" stroke="${palette.dark}" stroke-width="3" opacity="0.12"/>
      <path d="M160 1286 C368 1228 510 1296 674 1240 C842 1182 1014 1218 1144 1136" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" opacity="0.18"/>
      <path d="M1110 1114 L1148 1136 L1112 1162" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.24"/>
    </g>
  `
}

function renderWhenToUseDoNotUseBody(visual: ArticleVisual, palette: Palette): string {
  const labels = getApprovedVisibleLabels(visual)
  const lanes = [
    { fill: "#ffe4e6", stroke: "#be3455", text: "#9f1239" },
    { fill: "#fef3c7", stroke: "#d97706", text: "#92400e" },
    { fill: "#ffedd5", stroke: "#ea580c", text: "#9a3412" },
    { fill: "#fecdd3", stroke: "#be123c", text: "#881337" },
  ]
  const laneSvg = labels
    .slice(0, 4)
    .map((label, index) => {
      const x = 104 + index * 270
      const colour = lanes[index]
      const labelBlock = textBlock({
        text: label,
        x: x + 34,
        y: 1116,
        width: 202,
        size: 27,
        weight: 900,
        color: colour.text,
        maxLines: 2,
      })
      const symbol =
        index === 0
          ? `<rect x="${x + 70}" y="802" width="130" height="76" rx="28" fill="#ffffff" fill-opacity="0.62" stroke="${colour.stroke}" stroke-width="6"/><path d="M${x + 92} 840 H${x + 120} L${x + 144} 810 L${x + 172} 868 L${x + 192} 840" fill="none" stroke="${colour.stroke}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`
          : index === 1
            ? `<circle cx="${x + 135}" cy="842" r="68" fill="#ffffff" fill-opacity="0.56" stroke="${colour.stroke}" stroke-width="5"/><path d="M${x + 96} 842 H${x + 174}" stroke="${colour.stroke}" stroke-width="10" stroke-linecap="round"/><path d="M${x + 146} 806 L${x + 182} 842 L${x + 146} 878" fill="none" stroke="${colour.stroke}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`
            : index === 2
              ? `<rect x="${x + 76}" y="774" width="118" height="142" rx="30" fill="#ffffff" fill-opacity="0.58" stroke="${colour.stroke}" stroke-width="5"/><path d="M${x + 104} 828 H${x + 168} M${x + 104} 866 H${x + 154}" stroke="${colour.stroke}" stroke-width="8" stroke-linecap="round" opacity="0.70"/><circle cx="${x + 170}" cy="884" r="19" fill="${colour.stroke}" opacity="0.80"/>`
              : `<circle cx="${x + 135}" cy="842" r="70" fill="#ffffff" fill-opacity="0.58" stroke="${colour.stroke}" stroke-width="5"/><path d="M${x + 98} 842 C${x + 118} 806 ${x + 154} 806 ${x + 174} 842 C${x + 154} 878 ${x + 118} 878 ${x + 98} 842 Z" fill="none" stroke="${colour.stroke}" stroke-width="7"/><circle cx="${x + 136}" cy="842" r="14" fill="${colour.stroke}"/>`

      return `
        <g>
          <rect x="${x}" y="704" width="270" height="520" fill="${colour.fill}" fill-opacity="${index === 0 ? "0.64" : "0.56"}"/>
          <path d="M${x + 34} 748 H${x + 230}" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.42"/>
          <path d="M${x + 34} 1194 H${x + 230}" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.42"/>
          ${index > 0 ? `<path d="M${x} 724 V1200" stroke="#ffffff" stroke-width="4" opacity="0.60"/>` : ""}
          ${symbol}
          ${labelBlock.svg}
        </g>
      `
    })
    .join("")

  return `
    <g>
      <defs>
        <clipPath id="noUseRouteClip">
          <rect x="104" y="704" width="1080" height="520" rx="44"/>
        </clipPath>
      </defs>
      <rect x="104" y="704" width="1080" height="520" rx="44" fill="#ffffff" fill-opacity="0.60" stroke="${palette.light}" stroke-width="2"/>
      <g clip-path="url(#noUseRouteClip)">
        ${laneSvg}
      </g>
      <rect x="104" y="704" width="1080" height="520" rx="44" fill="none" stroke="${palette.dark}" stroke-width="3" opacity="0.12"/>
      <path d="M166 1286 C356 1198 548 1306 718 1206 C890 1104 1004 1156 1150 1058" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" opacity="0.18"/>
      <path d="M1118 1038 L1154 1058 L1122 1086" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.24"/>
    </g>
  `
}

function renderTelehealthPolicyCompositeOverlaySvg(visual: ArticleVisual): string {
  const palette = palettes[visual.accent]
  const title = textBlock({
    text: visual.title,
    x: 88,
    y: 168,
    width: 790,
    size: 56,
    weight: 900,
    color: palette.dark,
    lineHeight: 64,
    maxLines: 3,
  })
  const summary = textBlock({
    text: visual.summary,
    x: 92,
    y: 168 + title.height + 26,
    width: 760,
    size: 28,
    weight: 600,
    color: "#334155",
    lineHeight: 38,
    maxLines: 3,
  })
  const footer = textBlock({
    text: getFooterCopy(visual),
    x: 154,
    y: 1483,
    width: 680,
    size: 22,
    weight: 700,
    color: "#ffffff",
    maxLines: 1,
  })
  const body =
    visual.id === "first-telehealth-prep-map"
      ? renderFirstTelehealthPrepBody(visual, palette)
      : visual.id === "first-telehealth-what-happens"
        ? renderFirstTelehealthRouteBody(visual, palette)
        : visual.id === "first-telehealth-aftercare-map"
          ? renderFirstTelehealthAftercareBody(visual, palette)
          : visual.id === "telehealth-best-fit-map"
            ? renderWhenToUseTelehealthFitBody(visual, palette)
            : visual.id === "telehealth-care-route-map"
              ? renderWhenToUseRouteChoiceBody(visual, palette)
              : visual.id === "telehealth-do-not-use-map"
                ? renderWhenToUseDoNotUseBody(visual, palette)
          : visual.id === "telehealth-definition-map" || visual.id === "telehealth-consultation-channel-map"
      ? renderTelehealthDefinitionBody(visual, palette)
      : visual.id === "telehealth-suitability-boundary" || visual.id === "telehealth-consultation-fit"
        ? renderTelehealthBoundaryBody(visual, palette)
        : renderTelehealthWorkflowBody(visual, palette)

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <filter id="telehealthSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="20" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.11"/>
        </filter>
        <linearGradient id="telehealthTopVeil" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.92"/>
          <stop offset="64%" stop-color="#ffffff" stop-opacity="0.68"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.wash}" fill-opacity="0.10"/>
      <path d="M-80 518 C188 404 406 470 646 390 C858 320 1034 348 1340 218" fill="none" stroke="${palette.mid}" stroke-width="3" opacity="0.11"/>
      <path d="M-86 1302 C214 1162 404 1254 644 1146 C876 1042 1060 1068 1360 940" fill="none" stroke="${palette.dark}" stroke-width="3" opacity="0.09"/>
      <rect x="0" y="0" width="${WIDTH}" height="548" fill="url(#telehealthTopVeil)"/>
      ${badge(88, 82, visual.eyebrow, palette)}
      ${title.svg}
      ${summary.svg}
      <g filter="url(#telehealthSoftShadow)">
        ${body}
      </g>
      <rect x="80" y="1438" width="760" height="78" rx="25" fill="${palette.dark}" fill-opacity="0.93"/>
      <circle cx="123" cy="1477" r="23" fill="#ffffff" opacity="0.17"/>
      <path d="M112 1477 L123 1488 L143 1462" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      ${footer.svg}
    </svg>
  `
}

function renderCompositeOverlaySvg(visual: ArticleVisual): string {
  if (isTelehealthPolicyCompositeVisual(visual)) {
    return renderTelehealthPolicyCompositeOverlaySvg(visual)
  }

  const palette = palettes[visual.accent]
  const labelsOnly = visual.textMode === "labels"
  const overlayItems = labelsOnly
    ? getApprovedVisibleLabels(visual).map((label) => ({ label, detail: "" }))
    : visual.items
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
  const visibleItems = overlayItems.slice(0, 7)
  const useTwoColumns = labelsOnly && visibleItems.length > 4
  const itemCardWidth = useTwoColumns ? 390 : 820
  const itemCardHeight = labelsOnly ? 124 : 148
  const itemCardX = 96
  const itemCardY = labelsOnly ? (useTwoColumns ? 742 : 800) : 770
  const itemCards = visibleItems
    .map((item, index) => {
      const column = useTwoColumns ? index % 2 : 0
      const row = useTwoColumns ? Math.floor(index / 2) : index
      const x = itemCardX + column * (itemCardWidth + 32)
      const y = itemCardY + row * (labelsOnly ? 142 : 170)

      return renderItemCard(item, index, x, y, itemCardWidth, itemCardHeight, palette, {
        compact: labelsOnly,
        showDetail: !labelsOnly,
      })
    })
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

function renderCompositeFallbackUnderlaySvg(visual: ArticleVisual): string {
  const palette = palettes[visual.accent]
  const visualCue =
    visual.visualRole === "timeline"
      ? `<path d="M145 710 C344 590 476 864 662 728 C820 612 930 680 1110 560" fill="none" stroke="${palette.mid}" stroke-width="18" stroke-linecap="round" opacity="0.28"/>
         <path d="M210 1182 C390 1058 530 1212 710 1072 C880 940 1012 1016 1170 900" fill="none" stroke="${palette.dark}" stroke-width="12" stroke-linecap="round" opacity="0.18"/>`
      : visual.visualRole === "safety-boundary"
        ? `<path d="M106 690 H1148" stroke="${palette.mid}" stroke-width="22" stroke-linecap="round" opacity="0.22"/>
           <path d="M208 1230 C410 1106 562 1202 720 1064 C880 926 984 978 1158 842" fill="none" stroke="${palette.dark}" stroke-width="14" stroke-linecap="round" opacity="0.2"/>
           <rect x="840" y="578" width="300" height="300" rx="72" fill="${palette.light}" opacity="0.46" transform="rotate(-8 990 728)"/>`
        : `<path d="M132 704 C322 554 476 802 666 660 C846 526 970 610 1150 492" fill="none" stroke="${palette.mid}" stroke-width="16" stroke-linecap="round" opacity="0.24"/>
           <path d="M170 1190 C376 1058 532 1182 742 1030 C902 914 1018 966 1150 850" fill="none" stroke="${palette.dark}" stroke-width="12" stroke-linecap="round" opacity="0.18"/>`

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="${palette.wash}"/>
      ${renderBackgroundTexture(palette)}
      <circle cx="1090" cy="760" r="210" fill="${palette.light}" opacity="0.34"/>
      <circle cx="988" cy="1080" r="148" fill="${palette.mid}" opacity="0.12"/>
      <rect x="64" y="612" width="1040" height="250" rx="70" fill="#ffffff" opacity="0.42" transform="rotate(-6 584 737)"/>
      <rect x="778" y="318" width="356" height="356" rx="82" fill="#ffffff" opacity="0.48" transform="rotate(9 956 496)"/>
      ${visualCue}
      ${renderVisualMotif(visual, palette)}
    </svg>
  `
}

function approvedLabel(visual: ArticleVisual, fallback: string): string {
  return getApprovedVisibleLabels(visual).find((label) => label === fallback) ?? fallback
}

function renderControlledShell(
  visual: ArticleVisual,
  width: number,
  height: number,
  body: string,
  options: {
    titleX: number
    titleY: number
    titleWidth: number
    titleSize: number
    summaryWidth: number
    showSummary?: boolean
  },
) {
  const palette = palettes[visual.accent]
  const showSummary = options.showSummary ?? true
  const title = textBlock({
    text: visual.title,
    x: options.titleX,
    y: options.titleY,
    width: options.titleWidth,
    size: options.titleSize,
    weight: 900,
    color: palette.dark,
    lineHeight: Math.round(options.titleSize * 1.12),
    maxLines: 3,
  })
  const summary = showSummary
    ? textBlock({
        text: visual.summary,
        x: options.titleX + 4,
        y: options.titleY + title.height + 26,
        width: options.summaryWidth,
        size: width > 1300 ? 25 : 27,
        weight: 550,
        color: "#334155",
        lineHeight: width > 1300 ? 34 : 38,
        maxLines: width > 1300 ? 2 : 3,
      })
    : null
  const footer = textBlock({
    text: getFooterCopy(visual),
    x: 150,
    y: height - 72,
    width: 690,
    size: width > 1300 ? 21 : 22,
    weight: 700,
    color: "#ffffff",
    maxLines: 1,
  })

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <filter id="controlledShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.10"/>
        </filter>
        <linearGradient id="controlledWarm" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="${palette.light}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="${palette.wash}"/>
      <path d="M${-width * 0.05} ${height * 0.35} C${width * 0.2} ${height * 0.25} ${width * 0.34} ${height * 0.38} ${width * 0.52} ${height * 0.28} C${width * 0.72} ${height * 0.17} ${width * 0.86} ${height * 0.29} ${width * 1.08} ${height * 0.18}" fill="none" stroke="${palette.mid}" stroke-width="3" opacity="0.15"/>
      <path d="M${-width * 0.05} ${height * 0.82} C${width * 0.18} ${height * 0.7} ${width * 0.35} ${height * 0.86} ${width * 0.54} ${height * 0.73} C${width * 0.72} ${height * 0.61} ${width * 0.86} ${height * 0.73} ${width * 1.08} ${height * 0.62}" fill="none" stroke="${palette.mid}" stroke-width="3" opacity="0.13"/>
      ${badge(options.titleX, options.titleY - 84, visual.eyebrow, palette)}
      ${title.svg}
      ${summary?.svg ?? ""}
      <g filter="url(#controlledShadow)">
        ${body}
      </g>
      <rect x="80" y="${height - 122}" width="820" height="78" rx="26" fill="${palette.dark}"/>
      <circle cx="124" cy="${height - 83}" r="23" fill="#ffffff" opacity="0.17"/>
      <path d="M112 ${height - 83} L123 ${height - 72} L143 ${height - 98}" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      ${footer.svg}
    </svg>
  `
}

function renderScalpTopView({
  id,
  x,
  y,
  width,
  height,
  palette,
  density,
  partWidth = 28,
}: {
  id: string
  x: number
  y: number
  width: number
  height: number
  palette: Palette
  density: "high" | "medium" | "low" | "patchy"
  partWidth?: number
}) {
  const rows = density === "high" ? 8 : density === "medium" ? 7 : density === "patchy" ? 6 : 5
  const columns = density === "high" ? 12 : density === "medium" ? 10 : density === "patchy" ? 9 : 8
  const skipPatch = (row: number, column: number) =>
    density === "patchy" && ((row > 1 && row < 5 && column > 2 && column < 6) || (row === 4 && column > 6))

  const hairs = Array.from({ length: rows }).flatMap((_, row) =>
    Array.from({ length: columns }).map((__, column) => {
      if (skipPatch(row, column)) return ""
      const px = x + 20 + (column * (width - 40)) / Math.max(columns - 1, 1)
      const py = y + 18 + (row * (height - 36)) / Math.max(rows - 1, 1)
      const lean = (column % 3) - 1
      const opacity = density === "low" ? 0.38 : density === "medium" ? 0.55 : 0.7
      return `<path d="M${px} ${py + 10} C${px + lean * 6} ${py - 2} ${px + lean * 8} ${py - 10} ${px + lean * 3} ${py - 20}" fill="none" stroke="#334155" stroke-width="${density === "low" ? 2.4 : 3.2}" stroke-linecap="round" opacity="${opacity}"/>`
    }),
  ).join("")

  return `
    <g>
      <defs>
        <clipPath id="${id}">
          <ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}"/>
        </clipPath>
      </defs>
      <ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="#f8d8c8" stroke="${palette.mid}" stroke-width="3"/>
      <g clip-path="url(#${id})">
        <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#f8d8c8"/>
        ${hairs}
        <path d="M${x + width / 2} ${y + 16} C${x + width / 2 - partWidth} ${y + height * 0.35} ${x + width / 2 - partWidth} ${y + height * 0.62} ${x + width / 2} ${y + height - 16}" fill="none" stroke="#f9eee7" stroke-width="${partWidth}" stroke-linecap="round" opacity="0.96"/>
        <path d="M${x + width / 2} ${y + 20} C${x + width / 2 - partWidth * 0.55} ${y + height * 0.38} ${x + width / 2 - partWidth * 0.55} ${y + height * 0.62} ${x + width / 2} ${y + height - 20}" fill="none" stroke="#a16207" stroke-width="3" stroke-linecap="round" opacity="0.42"/>
      </g>
      <ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="none" stroke="#ffffff" stroke-width="7" opacity="0.55"/>
    </g>
  `
}

function renderFollicleCutaway({
  x,
  y,
  scale,
  palette,
  state,
}: {
  x: number
  y: number
  scale: number
  palette: Palette
  state: "full" | "mini" | "shedding" | "active"
}) {
  const hairWidth = state === "mini" ? 5 : state === "shedding" ? 7 : 10
  const hairOpacity = state === "mini" ? 0.45 : state === "shedding" ? 0.55 : 0.92
  const bulbFill = state === "active" ? "#2f855a" : state === "mini" ? "#cbd5e1" : "#7c4a2d"
  const glow = state === "active" ? `<circle cx="95" cy="125" r="46" fill="${palette.light}" opacity="0.85"/>` : ""

  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <rect x="0" y="0" width="180" height="156" rx="24" fill="#fff7ed" stroke="#e2e8f0" stroke-width="2"/>
      <path d="M0 45 H180" stroke="#f2b8a0" stroke-width="18" opacity="0.74"/>
      <path d="M0 75 H180" stroke="#f8d8c8" stroke-width="34" opacity="0.95"/>
      ${glow}
      <path d="M94 132 C84 96 90 62 108 36" fill="none" stroke="#5b3423" stroke-width="${hairWidth}" stroke-linecap="round" opacity="${hairOpacity}"/>
      <path d="M86 129 C70 105 76 78 94 60" fill="none" stroke="#8b5a3c" stroke-width="6" stroke-linecap="round" opacity="${state === "mini" ? 0.3 : 0.56}"/>
      <ellipse cx="88" cy="124" rx="${state === "mini" ? 14 : 24}" ry="${state === "mini" ? 12 : 21}" fill="${bulbFill}" opacity="0.9"/>
      <path d="M28 108 C52 94 72 98 88 120 C108 146 132 148 156 130" fill="none" stroke="#ef8fa1" stroke-width="5" stroke-linecap="round" opacity="0.6"/>
    </g>
  `
}

function renderConnectorArrow(x1: number, y1: number, x2: number, y2: number, color: string, width = 8) {
  const head = x2 >= x1 ? -1 : 1
  return `
    <path d="M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>
    <path d="M${x2 + head * 24} ${y2 - 18} L${x2} ${y2} L${x2 + head * 24} ${y2 + 18}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>
  `
}

function renderHairMechanismSvg(slug: string, visual: ArticleVisual) {
  const palette = palettes[visual.accent]
  const dhtLabel = approvedLabel(visual, "DHT signal")
  const patternLabel = approvedLabel(visual, "Pattern fit")
  const growthLabel = approvedLabel(visual, "Growth cycle")
  const reassessLabel = approvedLabel(visual, "Reassess")
  const panelY = 258
  const panelH = 520
  const body = `
    <rect x="54" y="${panelY}" width="490" height="${panelH}" rx="30" fill="#ffffff" stroke="${palette.mid}" stroke-width="2"/>
    <rect x="54" y="${panelY}" width="490" height="70" rx="30" fill="${palette.dark}"/>
    <rect x="54" y="${panelY + 40}" width="490" height="30" fill="${palette.dark}"/>
    <text x="88" y="${panelY + 46}" font-family="${SVG_FONT_FAMILY}" font-size="30" font-weight="900" fill="#ffffff">${escapeXml(dhtLabel)}</text>
    ${renderScalpTopView({ id: `${slug}-dht-1`, x: 88, y: panelY + 105, width: 118, height: 150, palette, density: "medium", partWidth: 20 })}
    ${renderScalpTopView({ id: `${slug}-dht-2`, x: 88, y: panelY + 308, width: 118, height: 150, palette, density: "low", partWidth: 34 })}
    ${renderConnectorArrow(148, panelY + 268, 148, panelY + 300, palette.mid, 7)}
    <g opacity="0.95">
      <circle cx="258" cy="${panelY + 144}" r="12" fill="${palette.dark}"/>
      <circle cx="292" cy="${panelY + 124}" r="12" fill="${palette.mid}"/>
      <circle cx="326" cy="${panelY + 150}" r="12" fill="${palette.dark}"/>
      <circle cx="278" cy="${panelY + 182}" r="12" fill="${palette.mid}"/>
      <circle cx="318" cy="${panelY + 190}" r="12" fill="${palette.dark}"/>
    </g>
    ${renderConnectorArrow(334, panelY + 178, 370, panelY + 178, palette.mid, 7)}
    ${renderFollicleCutaway({ x: 378, y: panelY + 102, scale: 0.72, palette, state: "full" })}
    ${renderFollicleCutaway({ x: 236, y: panelY + 312, scale: 0.72, palette, state: "mini" })}
    ${renderConnectorArrow(356, panelY + 390, 400, panelY + 390, palette.mid, 7)}
    ${renderFollicleCutaway({ x: 408, y: panelY + 312, scale: 0.72, palette, state: "mini" })}

    <rect x="574" y="${panelY}" width="360" height="${panelH}" rx="30" fill="#ffffff" stroke="#d8b4fe" stroke-width="2"/>
    <rect x="574" y="${panelY}" width="360" height="70" rx="30" fill="#7e4ea3"/>
    <rect x="574" y="${panelY + 40}" width="360" height="30" fill="#7e4ea3"/>
    <text x="608" y="${panelY + 46}" font-family="${SVG_FONT_FAMILY}" font-size="30" font-weight="900" fill="#ffffff">${escapeXml(patternLabel)}</text>
    ${renderScalpTopView({ id: `${slug}-pattern-1`, x: 630, y: panelY + 108, width: 152, height: 176, palette, density: "medium", partWidth: 25 })}
    ${renderScalpTopView({ id: `${slug}-pattern-2`, x: 730, y: panelY + 250, width: 152, height: 176, palette, density: "low", partWidth: 38 })}
    <circle cx="828" cy="${panelY + 166}" r="33" fill="#f5f3ff" stroke="#7e4ea3" stroke-width="4"/>
    <path d="M810 ${panelY + 166} L824 ${panelY + 181} L850 ${panelY + 148}" fill="none" stroke="#7e4ea3" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="626" y="${panelY + 448}" width="254" height="56" rx="20" fill="#7e4ea3"/>
    <text x="680" y="${panelY + 486}" font-family="${SVG_FONT_FAMILY}" font-size="29" font-weight="900" fill="#ffffff">${escapeXml(reassessLabel)}</text>

    ${renderConnectorArrow(546, panelY + 260, 572, panelY + 260, palette.mid, 9)}
    ${renderConnectorArrow(936, panelY + 260, 966, panelY + 260, "#2f855a", 9)}

    <rect x="966" y="${panelY}" width="580" height="${panelH}" rx="30" fill="#ffffff" stroke="#86efac" stroke-width="2"/>
    <rect x="966" y="${panelY}" width="580" height="70" rx="30" fill="#2f855a"/>
    <rect x="966" y="${panelY + 40}" width="580" height="30" fill="#2f855a"/>
    <text x="1002" y="${panelY + 46}" font-family="${SVG_FONT_FAMILY}" font-size="30" font-weight="900" fill="#ffffff">${escapeXml(growthLabel)}</text>
    <circle cx="1254" cy="${panelY + 292}" r="142" fill="#ecfdf5" stroke="#86efac" stroke-width="4"/>
    <path d="M1254 ${panelY + 136} C1350 ${panelY + 172} 1398 ${panelY + 250} 1376 ${panelY + 332}" fill="none" stroke="#2f855a" stroke-width="10" stroke-linecap="round"/>
    <path d="M1130 ${panelY + 330} C1112 ${panelY + 236} 1156 ${panelY + 160} 1238 ${panelY + 132}" fill="none" stroke="#2f855a" stroke-width="10" stroke-linecap="round"/>
    <path d="M1366 ${panelY + 296} L1376 ${panelY + 332} L1342 ${panelY + 318}" fill="none" stroke="#2f855a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M1166 ${panelY + 146} L1238 ${panelY + 132} L1204 ${panelY + 190}" fill="none" stroke="#2f855a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    ${renderFollicleCutaway({ x: 1128, y: panelY + 178, scale: 0.7, palette, state: "shedding" })}
    ${renderFollicleCutaway({ x: 1274, y: panelY + 98, scale: 0.7, palette, state: "full" })}
    ${renderFollicleCutaway({ x: 1320, y: panelY + 314, scale: 0.7, palette, state: "active" })}
    ${renderFollicleCutaway({ x: 1088, y: panelY + 354, scale: 0.7, palette, state: "active" })}
    <g opacity="0.9">
      <path d="M1236 ${panelY + 284} C1216 ${panelY + 246} 1260 ${panelY + 244} 1244 ${panelY + 284} C1242 ${panelY + 294} 1238 ${panelY + 294} 1236 ${panelY + 284}" fill="#39b68f"/>
      <path d="M1278 ${panelY + 292} C1258 ${panelY + 254} 1302 ${panelY + 252} 1286 ${panelY + 292} C1284 ${panelY + 302} 1280 ${panelY + 302} 1278 ${panelY + 292}" fill="#39b68f"/>
      <path d="M1258 ${panelY + 334} C1238 ${panelY + 296} 1282 ${panelY + 294} 1266 ${panelY + 334} C1264 ${panelY + 344} 1260 ${panelY + 344} 1258 ${panelY + 334}" fill="#39b68f"/>
    </g>
  `

  return renderControlledShell(visual, 1600, 900, body, {
    titleX: 54,
    titleY: 110,
    titleWidth: 1180,
    titleSize: 56,
    summaryWidth: 1060,
    showSummary: false,
  })
}

function renderHairTimelineSvg(slug: string, visual: ArticleVisual) {
  const palette = palettes[visual.accent]
  const labels = ["Baseline", "Shedding", "Stabilise", "Compare", "Continue"].map((label) => approvedLabel(visual, label))
  const densities: Array<"medium" | "low" | "medium" | "high" | "high"> = ["medium", "low", "medium", "high", "high"]
  const follicleStates: Array<"full" | "shedding" | "mini" | "active" | "active"> = ["full", "shedding", "mini", "active", "active"]
  const startY = 480
  const rowH = 164
  const rows = labels
    .map((label, index) => {
      const y = startY + index * (rowH + 18)
      const fill = index % 2 === 0 ? "#ffffff" : "#fffdf6"
      const accent = index < 2 ? palette.dark : index === 2 ? "#087457" : "#2f855a"
      const compareInset =
        label === "Compare"
          ? `${renderScalpTopView({ id: `${slug}-timeline-${index}-a`, x: 494, y: y + 28, width: 118, height: 110, palette, density: "medium", partWidth: 28 })}
             ${renderConnectorArrow(626, y + 84, 672, y + 84, accent, 6)}
             ${renderScalpTopView({ id: `${slug}-timeline-${index}-b`, x: 686, y: y + 28, width: 118, height: 110, palette, density: "high", partWidth: 18 })}`
          : renderScalpTopView({ id: `${slug}-timeline-${index}`, x: 540, y: y + 22, width: 178, height: 120, palette, density: densities[index], partWidth: index === 1 ? 40 : index > 2 ? 18 : 28 })

      return `
        <rect x="96" y="${y}" width="1088" height="${rowH}" rx="26" fill="${fill}" stroke="#e2e8f0" stroke-width="2"/>
        <circle cx="150" cy="${y + rowH / 2}" r="38" fill="${accent}" opacity="0.95"/>
        <text x="${index === 0 ? 139 : 136}" y="${y + rowH / 2 + 12}" font-family="${SVG_FONT_FAMILY}" font-size="34" font-weight="950" fill="#ffffff">${index + 1}</text>
        <text x="218" y="${y + 76}" font-family="${SVG_FONT_FAMILY}" font-size="34" font-weight="900" fill="${palette.text}">${escapeXml(label)}</text>
        ${compareInset}
        ${renderFollicleCutaway({ x: 876, y: y + 22, scale: 0.74, palette, state: follicleStates[index] })}
        ${index < labels.length - 1 ? `<path d="M150 ${y + rowH + 8} V${y + rowH + 34}" stroke="${accent}" stroke-width="7" stroke-linecap="round"/><path d="M136 ${y + rowH + 24} L150 ${y + rowH + 42} L164 ${y + rowH + 24}" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
      `
    })
    .join("")

  return renderControlledShell(visual, WIDTH, HEIGHT, rows, {
    titleX: 80,
    titleY: 160,
    titleWidth: 1000,
    titleSize: 58,
    summaryWidth: 940,
  })
}

function renderPulseIcon(x: number, y: number, palette: Palette) {
  return `
    <g transform="translate(${x} ${y})">
      <circle cx="86" cy="86" r="72" fill="#fff1f2" stroke="${palette.mid}" stroke-width="3"/>
      <path d="M44 88 H68 L82 58 L104 118 L120 88 H150" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `
}

function renderSafetyBoundarySvg(slug: string, visual: ArticleVisual) {
  const palette = palettes[visual.accent]
  const systemic = approvedLabel(visual, "Systemic effects")
  const mood = approvedLabel(visual, "Mood changes")
  const pregnancy = approvedLabel(visual, "Pregnancy handling")
  const psa = approvedLabel(visual, "PSA context")
  const scalp = approvedLabel(visual, "Scalp irritation")
  const heart = approvedLabel(visual, "Heart symptoms")
  const pattern = approvedLabel(visual, "Different pattern")
  const chip = (x: number, y: number, label: string, tone: "caution" | "urgent" = "caution") => {
    const toneColor = tonePalette[tone]
    return `
      <rect x="${x}" y="${y}" width="292" height="64" rx="22" fill="${toneColor.bg}" stroke="#ffffff" stroke-width="3"/>
      <text x="${x + 28}" y="${y + 42}" font-family="${SVG_FONT_FAMILY}" font-size="25" font-weight="850" fill="${toneColor.fg}">${escapeXml(label)}</text>
    `
  }

  const body = `
    <rect x="92" y="520" width="1096" height="278" rx="34" fill="#ffffff" stroke="${palette.mid}" stroke-width="2"/>
    <rect x="124" y="552" width="300" height="214" rx="28" fill="${palette.light}"/>
    <path d="M246 642 C220 598 260 570 304 584 C354 600 362 666 310 708 C286 728 256 710 246 642" fill="#ffffff" stroke="${palette.dark}" stroke-width="7" opacity="0.9"/>
    <circle cx="270" cy="626" r="9" fill="${palette.mid}"/>
    <circle cx="306" cy="640" r="9" fill="${palette.mid}"/>
    <circle cx="286" cy="676" r="9" fill="${palette.mid}"/>
    <text x="464" y="596" font-family="${SVG_FONT_FAMILY}" font-size="34" font-weight="900" fill="${palette.text}">${escapeXml(systemic)}</text>
    ${chip(464, 630, mood)}
    ${chip(778, 630, pregnancy)}
    ${chip(464, 710, psa)}
    <path d="M982 712 C1020 676 1066 690 1088 730" fill="none" stroke="${palette.mid}" stroke-width="9" stroke-linecap="round" opacity="0.62"/>

    <rect x="92" y="838" width="524" height="304" rx="34" fill="#ffffff" stroke="${palette.mid}" stroke-width="2"/>
    <text x="128" y="890" font-family="${SVG_FONT_FAMILY}" font-size="32" font-weight="900" fill="${palette.text}">${escapeXml(scalp)}</text>
    ${renderScalpTopView({ id: `${slug}-safety-scalp`, x: 142, y: 930, width: 186, height: 152, palette, density: "patchy", partWidth: 34 })}
    ${renderFollicleCutaway({ x: 368, y: 922, scale: 0.9, palette, state: "shedding" })}
    <path d="M164 1098 C248 1068 304 1096 376 1064 C440 1038 490 1044 548 1000" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" opacity="0.45"/>

    <rect x="656" y="838" width="532" height="304" rx="34" fill="#ffffff" stroke="${palette.mid}" stroke-width="2"/>
    <text x="692" y="890" font-family="${SVG_FONT_FAMILY}" font-size="32" font-weight="900" fill="${palette.text}">${escapeXml(heart)}</text>
    ${renderPulseIcon(696, 930, palette)}
    <rect x="910" y="956" width="188" height="92" rx="28" fill="#fff1f2"/>
    <path d="M934 1002 H976 L996 970 L1026 1032 L1044 1002 H1080" fill="none" stroke="${palette.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="1120" cy="1002" r="19" fill="${palette.dark}" opacity="0.85"/>

    <rect x="92" y="1182" width="1096" height="174" rx="34" fill="#ffffff" stroke="${palette.mid}" stroke-width="2"/>
    <text x="128" y="1236" font-family="${SVG_FONT_FAMILY}" font-size="32" font-weight="900" fill="${palette.text}">${escapeXml(pattern)}</text>
    ${renderScalpTopView({ id: `${slug}-safety-pattern-a`, x: 520, y: 1210, width: 138, height: 116, palette, density: "patchy", partWidth: 36 })}
    ${renderScalpTopView({ id: `${slug}-safety-pattern-b`, x: 708, y: 1210, width: 138, height: 116, palette, density: "low", partWidth: 44 })}
    ${renderScalpTopView({ id: `${slug}-safety-pattern-c`, x: 896, y: 1210, width: 138, height: 116, palette, density: "medium", partWidth: 22 })}
    <path d="M660 1268 H696 M848 1268 H884" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round"/>
    <path d="M688 1252 L704 1268 L688 1284 M876 1252 L892 1268 L876 1284" fill="none" stroke="${palette.mid}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  `

  return renderControlledShell(visual, WIDTH, HEIGHT, body, {
    titleX: 80,
    titleY: 160,
    titleWidth: 1010,
    titleSize: 52,
    summaryWidth: 980,
  })
}

function renderControlledArticleVisualSvg(slug: string, visual: ArticleVisual): string | null {
  if (slug !== "finasteride-vs-minoxidil-hair-loss") return null

  switch (visual.id) {
    case "hair-loss-mechanism-map":
      return renderHairMechanismSvg(slug, visual)
    case "hair-treatment-response-timeline":
      return renderHairTimelineSvg(slug, visual)
    case "hair-medicine-safety-boundary":
      return renderSafetyBoundarySvg(slug, visual)
    default:
      return null
  }
}

async function saveInfographic(slug: string, visual: ArticleVisual) {
  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visual.id}.webp`)
  const svg = renderControlledArticleVisualSvg(slug, visual) ?? renderArticleVisualSvg(slug, visual)
  await sharp(Buffer.from(svg)).webp({ quality: 88, effort: 5 }).toFile(filepath)
  await addInstantMedWordmark(filepath)
  return filepath
}

async function saveDeterministicCompositeInfographic(slug: string, visual: ArticleVisual) {
  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visual.id}.webp`)
  const controlledSvg = renderControlledArticleVisualSvg(slug, visual)
  if (controlledSvg) {
    await sharp(Buffer.from(controlledSvg)).webp({ quality: 88, effort: 5 }).toFile(filepath)
    await addInstantMedWordmark(filepath)
    return filepath
  }

  await sharp(Buffer.from(renderCompositeFallbackUnderlaySvg(visual)))
    .composite([{ input: Buffer.from(renderCompositeOverlaySvg(visual)), left: 0, top: 0 }])
    .webp({ quality: 88, effort: 5 })
    .toFile(filepath)

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

async function saveOpenAIInfographic(
  slug: string,
  visual: ArticleVisual,
  styleShift = 0,
  size: GatewayImageSize = DEFAULT_GATEWAY_SIZE,
) {
  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visual.id}.webp`)
  const result = await generateImage({
    model: openai.image("gpt-image-2"),
    prompt: buildGatewayPrompt(slug, visual, styleShift, size),
    size,
  })

  await sharp(Buffer.from(result.image.uint8Array))
    .webp({ quality: 88, effort: 5 })
    .toFile(filepath)

  await addInstantMedWordmark(filepath)
  return filepath
}

async function saveOpenAICompositeInfographic(
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
    model: openai.image("gpt-image-2"),
    prompt: buildGatewayCompositeUnderlayPrompt(slug, visual, styleShift),
    size,
  })

  await sharp(Buffer.from(result.image.uint8Array))
    .resize(WIDTH, HEIGHT, { fit: "cover", background: palette.wash })
    .composite([{ input: Buffer.from(renderCompositeOverlaySvg(visual)), left: 0, top: 0 }])
    .webp({ quality: 88, effort: 5 })
    .toFile(filepath)

  await addInstantMedWordmark(filepath)
  return filepath
}

function getKieModel(renderer: KieRenderer) {
  return renderer.startsWith("kie-gpt-image-2") ? KIE_GPT_IMAGE_2_MODEL : KIE_NANO_BANANA_2_MODEL
}

function getKieAspectRatio(visual: ArticleVisual) {
  return visual.layout === "wide" ? "16:9" : "3:4"
}

async function readKieResponse(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`Kie returned non-JSON response (${response.status}): ${text.slice(0, 160)}`)
  }
}

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function parseKieResultUrls(resultJson: unknown): string[] {
  const raw = getString(resultJson)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    const result = getObject(parsed)
    const urls = result.resultUrls ?? result.urls ?? result.images
    if (Array.isArray(urls)) {
      return urls.map(getString).filter((url): url is string => Boolean(url))
    }

    const singleUrl = getString(result.resultUrl ?? result.url ?? result.imageUrl)
    return singleUrl ? [singleUrl] : []
  } catch {
    return /^https?:\/\//.test(raw) ? [raw] : []
  }
}

async function createKieTask(
  slug: string,
  visual: ArticleVisual,
  renderer: KieRenderer,
  resolution: KieResolution,
  styleShift = 0,
) {
  assertKieAuth()
  const model = getKieModel(renderer)
  const prompt = isKieCompositeRenderer(renderer)
    ? buildKieCompositeUnderlayPrompt(slug, visual, renderer, styleShift)
    : buildKiePrompt(slug, visual, renderer as KieDirectRenderer, styleShift)
  const input =
    renderer.startsWith("kie-nano-banana-2")
      ? {
          prompt,
          image_input: [],
          aspect_ratio: getKieAspectRatio(visual),
          resolution,
          output_format: "png",
        }
      : {
          prompt,
          aspect_ratio: getKieAspectRatio(visual),
        }

  const response = await fetch(`${KIE_API_BASE_URL}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KIE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
    }),
  })
  const payload = await readKieResponse(response)
  if (!response.ok || payload.code !== 200) {
    throw new Error(`Kie createTask failed for ${visual.id}: ${payload.msg ?? response.status}`)
  }

  const taskId = getString(getObject(payload.data).taskId)
  if (!taskId) {
    throw new Error(`Kie createTask response did not include a taskId for ${visual.id}.`)
  }
  return taskId
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pollKieTask(taskId: string) {
  const startedAt = Date.now()
  let attempt = 0

  while (Date.now() - startedAt < 15 * 60 * 1000) {
    const response = await fetch(`${KIE_API_BASE_URL}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
      headers: {
        Authorization: `Bearer ${process.env.KIE_API_KEY}`,
      },
    })
    const payload = await readKieResponse(response)
    if (!response.ok) {
      throw new Error(`Kie recordInfo failed for ${taskId}: ${payload.msg ?? response.status}`)
    }

    const data = getObject(payload.data)
    const state = getString(data.state)
    const progress = typeof data.progress === "number" ? data.progress : null
    console.log(`Kie task ${taskId}: ${state ?? "unknown"}${progress !== null ? ` (${progress}%)` : ""}`)

    if (state === "success") {
      const resultUrls = parseKieResultUrls(data.resultJson)
      if (resultUrls.length === 0) {
        throw new Error(`Kie task ${taskId} succeeded without a result URL.`)
      }
      return resultUrls[0]
    }

    if (state === "fail") {
      throw new Error(`Kie task ${taskId} failed: ${data.failMsg ?? data.failCode ?? "unknown error"}`)
    }

    attempt += 1
    await delay(Math.min(10_000, 2_000 + attempt * 1_000))
  }

  throw new Error(`Timed out waiting for Kie task ${taskId}.`)
}

async function saveKieInfographic(
  slug: string,
  visual: ArticleVisual,
  renderer: KieRenderer,
  resolution: KieResolution,
  styleShift = 0,
) {
  const outputDir = path.join(process.cwd(), "public", "images", "blog", slug)
  await fs.mkdir(outputDir, { recursive: true })

  const filepath = path.join(outputDir, `${visual.id}.webp`)
  const taskId = await createKieTask(slug, visual, renderer, resolution, styleShift)
  const resultUrl = await pollKieTask(taskId)
  const imageResponse = await fetch(resultUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to download Kie image for ${visual.id}: ${imageResponse.status}`)
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
  const strongWash = visual.visualFormat === "red-flag-warning" || visual.kind === "warning"
  const pipeline = isKieCompositeRenderer(renderer)
    ? sharp(imageBuffer)
        .resize(WIDTH, HEIGHT, { fit: "cover", background: palettes[visual.accent].wash })
        .blur(strongWash ? 8 : 4)
        .modulate(strongWash ? { saturation: 0.36, brightness: 1.06 } : { saturation: 0.62, brightness: 1.02 })
        .composite([
          { input: Buffer.from(renderCompositeUnderlayWashSvg(visual)), left: 0, top: 0 },
          { input: Buffer.from(renderCompositeOverlaySvg(visual)), left: 0, top: 0 },
        ])
    : sharp(imageBuffer)

  await pipeline.webp({ quality: 88, effort: 5 }).toFile(filepath)

  await addInstantMedWordmark(filepath)
  return filepath
}

async function main() {
  const slugFilters = getSlugFilters()
  const visualFilter = getArg("visual")
  const limit = Number(getArg("limit") ?? "0")
  const styleShift = Number(getArg("style-shift") ?? "0")
  const gatewayImageSize = getGatewayImageSize()
  const kieResolution = getKieResolution()
  const dryRun = hasFlag("dry-run")
  const force = hasFlag("force")
  const renderer = getRenderer()

  if (renderer === "gpt-image-2" || renderer === "gpt-image-2-composite") {
    assertGatewayAuth()
  }
  if (renderer === "openai-gpt-image-2" || renderer === "openai-gpt-image-2-composite") {
    assertOpenAIAuth()
  }
  if (isKieRenderer(renderer)) {
    assertKieAuth()
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
    const effectiveRenderer = getEffectiveRenderer(renderer, visual)
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
        effectiveRenderer === "gpt-image-2"
          ? buildGatewayPrompt(slug, visual, styleShift, gatewayImageSize)
          : effectiveRenderer === "gpt-image-2-composite"
            ? buildGatewayCompositeUnderlayPrompt(slug, visual, styleShift)
            : effectiveRenderer === "openai-gpt-image-2"
              ? buildGatewayPrompt(slug, visual, styleShift, gatewayImageSize)
              : effectiveRenderer === "openai-gpt-image-2-composite"
                ? buildGatewayCompositeUnderlayPrompt(slug, visual, styleShift)
            : isKieRenderer(effectiveRenderer)
              ? isKieCompositeRenderer(effectiveRenderer)
                ? buildKieCompositeUnderlayPrompt(slug, visual, effectiveRenderer, styleShift)
                : buildKiePrompt(slug, visual, effectiveRenderer as KieDirectRenderer, styleShift)
            : effectiveRenderer === "deterministic-composite"
              ? renderCompositeFallbackUnderlaySvg(visual)
            : renderArticleVisualSvg(slug, visual)
      console.log(`\n--- ${slug}/${visual.id} (${effectiveRenderer}) ---\n${output}`)
      continue
    }

    console.log(`Generating ${effectiveRenderer} visual ${slug}/${visual.id}...`)
    const saved =
      effectiveRenderer === "gpt-image-2"
        ? await saveGatewayInfographic(slug, visual, styleShift, gatewayImageSize)
        : effectiveRenderer === "gpt-image-2-composite"
          ? await saveGatewayCompositeInfographic(slug, visual, styleShift, gatewayImageSize)
          : effectiveRenderer === "openai-gpt-image-2"
            ? await saveOpenAIInfographic(slug, visual, styleShift, gatewayImageSize)
            : effectiveRenderer === "openai-gpt-image-2-composite"
              ? await saveOpenAICompositeInfographic(slug, visual, styleShift, gatewayImageSize)
          : isKieRenderer(effectiveRenderer)
            ? await saveKieInfographic(slug, visual, effectiveRenderer, kieResolution, styleShift)
          : effectiveRenderer === "deterministic-composite"
            ? await saveDeterministicCompositeInfographic(slug, visual)
          : await saveInfographic(slug, visual)
    console.log(`Saved ${path.relative(process.cwd(), saved)}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
