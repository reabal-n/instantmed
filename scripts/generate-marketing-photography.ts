/* eslint-disable no-console */

import { execFile } from "node:child_process"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import { gateway, generateImage } from "ai"
import dotenv from "dotenv"
import sharp from "sharp"

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false, quiet: true })
dotenv.config({ path: path.join(process.cwd(), ".env"), override: false, quiet: true })

const execFileAsync = promisify(execFile)

const GPT_IMAGE_MODEL = "openai/gpt-image-2"
const SOURCE_SIZE = "2048x1536"
const SOURCE_DIR = path.join(process.cwd(), ".codex", "generated", "instantmed-photography", "sources")
const CONTACT_SHEET_PATH = path.join(process.cwd(), ".codex", "generated", "instantmed-photography", "contact-sheet.webp")
const PUBLIC_IMAGE_DIR = path.join(process.cwd(), "public", "images", "instantmed-photography")
const MANIFEST_PATH = path.join(PUBLIC_IMAGE_DIR, "instantmed-photography.json")
const WEBP_TARGET_BYTES = 200 * 1024
const WEBP_TARGET_WITH_METADATA_HEADROOM = 196 * 1024

interface ShotSpec {
  id: string
  filename: string
  title: string
  use: string
  scene: string
  subject: string
  mood: string
  diversity: string
  alt: string
  criticalConstraints?: string[]
}

interface WrittenAsset {
  path: string
  width: number
  height: number
  bytes: number
  quality: number
}

interface ShotManifest extends ShotSpec {
  aiDisclosure: string
  generator: string
  sourceSize: string
  assets: {
    banner16x9: WrittenAsset
    accent4x3: WrittenAsset
    social1x1: WrittenAsset
    ogWebp: WrittenAsset
    ogJpg: WrittenAsset
  }
}

const aiDisclosure =
  "AI-generated marketing image created with GPT-image-2 for InstantMed. No real patient, child, pharmacist, doctor, certificate, eScript, or practitioner identity is depicted."

const standingPrompt = [
  "Photograph in the style of Australian editorial lifestyle photography for a regulated Australian telehealth website.",
  "Late-morning Sydney/Melbourne/Brisbane window light, soft and indirect, slightly overexposed in highlights, 5200K-5800K, warm-white rather than cool-white.",
  "Shallow depth of field, single focal subject, candid mid-action moment, not posed, no eye contact with camera.",
  "Real lived-in Australian interior or street, not a studio. Subtle Australian-context cues may include eucalyptus through a window, AU power outlet, terrace balcony, linen curtains, a coffee mug, or understated pharmacy signage.",
  "Morning Canvas palette: warm ivory, soft sky blue, dawn peach, champagne, true-to-life skin tones. No teal-and-orange grading, no cold blue cast, no fluorescent green tint, no golden-hour saturation.",
  "Compositional restraint: one subject, rule of thirds, negative space, quiet premium editorial feel, crop-safe for 16:9, 4:3, 1:1, and 1200x630.",
  "Captured on a Leica Q3-style sensor, 28mm equivalent, f/2.8, natural grain, believable lens falloff.",
  "Avoid: crypto/SaaS/wellness influencer aesthetic, lab coats, posed doctors, stethoscopes as a hero prop, sterile white studio, fake testimonial energy, glossy AI glow, tablets held by doctors, smiling group around a laptop, American outlets, EU plugs, North American signage, visible real brand logos, prescription medicine names, patient names, practitioner names, or official-looking government documents.",
].join(" ")

const shots: ShotSpec[] = [
  {
    id: "home-1",
    filename: "home-1.webp",
    title: "Person at home reading their phone",
    use: "Reserved for future /home editorial accents and email headers",
    scene:
      "A Sydney apartment bedroom or living room in soft late-morning light. Linen sheets or a couch, a mug of tea on the side table, eucalyptus visible through the window, slightly lived-in but tidy.",
    subject:
      "Australian adult in their late 20s to mid 40s, sitting up in bed or on a couch, phone in hand, tired but calm, mid-glance at the screen.",
    mood: "Relief, the moment they realise they do not have to drive anywhere.",
    diversity: "Mixed-ethnicity Australian patient, realistic body type.",
    alt: "A tired patient sits in soft morning light at home, reading their phone beside a mug of tea.",
  },
  {
    id: "consult-1",
    filename: "consult-1.webp",
    title: "Person on a video-free phone consult",
    use: "/weight-loss, /consult, and future ad creative",
    scene:
      "A lived-in Australian kitchen bench or dining table with late-morning window light, a coffee or water glass nearby, an AU power outlet subtly visible.",
    subject:
      "Australian adult in their 30s, typing or reading on a phone resting on the bench. Engaged but unhurried. This is asynchronous form completion, not a video call.",
    mood: "Considered, answering thoroughly because a real doctor will read it.",
    diversity: "Asian-Australian or South Asian-Australian patient, realistic body type.",
    alt: "A patient calmly fills in a secure health form on their phone at a kitchen bench.",
    criticalConstraints: ["No video-call UI, no doctor on screen, no drug names."],
  },
  {
    id: "rx-1",
    filename: "rx-1.webp",
    title: "At a pharmacy counter",
    use: "/prescriptions EScript explainer accent",
    scene:
      "An Australian pharmacy counter with generic green-and-white pharmacy shelves in soft focus, understated Healthy Living-style signage, and an indistinct pharmacist shape in the background.",
    subject:
      "Older Australian patient over 55 holding a phone toward the counter. The screen suggests an SMS-style eScript token but contains no real barcode, no QR code, no medication name, and no patient name.",
    mood: "Frictionless, they showed their phone and can collect their medication if approved by the doctor.",
    diversity: "Older patient over 55, Mediterranean-Australian or Middle Eastern-Australian, realistic body type.",
    alt: "An older patient shows a phone at an Australian pharmacy counter while the pharmacist is softly out of focus.",
    criticalConstraints: ["No real pharmacy brand logos, no readable prescription drug names, no scannable token."],
  },
  {
    id: "med-cert-context",
    filename: "med-cert-context.webp",
    title: "Sick person on a couch with their laptop",
    use: "/medical-certificate lifestyle slot and email confirmation",
    scene:
      "A couch in an Australian apartment with soft afternoon daylight through linen curtains, throw blanket, tissue box, glass of water, and a laptop open nearby.",
    subject:
      "Australian adult in their 30s or 40s under a throw blanket, looking unwell but functional. Laptop screen shows a generic document or inbox with a large SPECIMEN watermark only, no names.",
    mood: "Honest, genuinely sick and not keen to leave the couch.",
    diversity: "First Nations, Pacific Islander, or mixed-ethnicity Australian patient, realistic body type.",
    alt: "A sick patient rests on a couch with water and tissues nearby while a laptop sits open beside them.",
    criticalConstraints: ["Laptop content must be generic with SPECIMEN only, no realistic certificate text."],
  },
  {
    id: "doctor-reviewing",
    filename: "doctor-reviewing.webp",
    title: "Clinician hands typing on a laptop",
    use: "/trust, /clinical-governance, /our-doctors, and /how-it-works",
    scene:
      "Top-down or over-the-shoulder clinical desk in an Australian home office or consulting room, coffee mug, notebook, and a soft out-of-focus Medicare/AHPRA-context notice shape in the background.",
    subject:
      "Clinician hands typing on a laptop, face fully out of frame or obscured. Stethoscope may be present as a small soft background object, never the main prop.",
    mood: "Considered, someone is reading the request carefully.",
    diversity: "No identifiable face. Hands-only clinician representation.",
    alt: "A clinician reviews a request on a laptop, shown only by their hands at a quiet desk.",
    criticalConstraints: ["No doctor face, no readable doctor name, no visible patient data, no fake medical registration number."],
  },
  {
    id: "australian-context",
    filename: "australian-context.webp",
    title: "Wide-shot Australian morning",
    use: "/about, /trust, and hero backdrop options",
    scene:
      "A wide environmental shot of an understated Australian morning: a Sydney terrace street or Brisbane apartment balcony view with eucalyptus, warm ivory buildings, soft early light, and no people.",
    subject: "Australian place, not a landmark postcard. Residential, quiet, grounded, unmistakably local.",
    mood: "Grounded, we are from here.",
    diversity: "No people.",
    alt: "A quiet Australian residential street in soft morning light with eucalyptus in the background.",
    criticalConstraints: ["No people, no tourist postcard composition, no flags, no beach cliché."],
  },
  {
    id: "phone-cert-detail",
    filename: "phone-cert-detail.webp",
    title: "Macro phone showing a certificate",
    use: "OG images, hero detail shots, and email confirmation",
    scene:
      "Tight macro on a hand holding a phone above a warm wooden surface, shallow depth of field, coffee mug ring or soft linen in the background.",
    subject:
      "Phone screen in sharp focus showing a generic medical certificate PDF preview with a large SPECIMEN watermark and no real name, no real doctor, no valid certificate number, no official seal.",
    mood: "Resolved, it is done and in their hand.",
    diversity: "Australian patient hand, realistic skin tone and natural fingernails.",
    alt: "A hand holds a phone showing a specimen medical certificate preview on a warm wooden table.",
    criticalConstraints: ["SPECIMEN watermark required, no scannable code, no real certificate details, no practitioner name."],
  },
  {
    id: "family-context",
    filename: "family-context.webp",
    title: "Parent and child sick day",
    use: "/for/parents, /faq, and future carer's leave content",
    scene:
      "A lived-in Australian living room in soft daylight, couch, linen blanket, child-safe simple interior, phone visible in the parent's hand or on the couch showing only a generic calendar/message shape.",
    subject:
      "Parent on a couch with a child napping with their head on the parent's lap. Parent looks tired but settled, not posing, not looking at camera.",
    mood: "Domestic, needing a carer's leave certificate without dragging a sick child to a clinic.",
    diversity: "Parent in their 30s or 40s with primary-school-age child, diverse Australian household, realistic body types.",
    alt: "A parent sits quietly on a couch while their sick child naps on their lap, with a phone nearby.",
    criticalConstraints: ["No distressed child, no visible illness severity, no testimonial-style eye contact."],
  },
]

function configureGatewayAuth() {
  process.env.AI_GATEWAY_API_KEY ||= process.env.VERCEL_AI_GATEWAY_API_KEY
}

function assertGatewayAuth() {
  configureGatewayAuth()
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error("Missing AI Gateway auth. Run `vercel env pull .env.local --yes` or set AI_GATEWAY_API_KEY.")
  }
}

function buildPrompt(shot: ShotSpec) {
  return [
    `Use case: photorealistic-natural`,
    `Asset type: InstantMed production marketing photography, ${shot.use}.`,
    `Primary request: ${shot.title}.`,
    `Standing visual direction: ${standingPrompt}`,
    `Scene/backdrop: ${shot.scene}`,
    `Subject: ${shot.subject}`,
    `Mood: ${shot.mood}`,
    `Diversity/casting note: ${shot.diversity}`,
    `Composition/framing: Generate a 4:3 source composition at ${SOURCE_SIZE}; keep the key subject and phone/certificate detail inside the center-safe area so 16:9, 4:3, 1:1, and 1200x630 crops all work. Leave calm negative space. Do not crop hands, phones, heads, or the child.`,
    `Compliance constraints: ${aiDisclosure} Generated people must not look like testimonials or real named patients. Do not show a doctor face. Do not show patient names, practitioner names, real barcodes, QR codes, official certificate numbers, Medicare numbers, AHPRA numbers, prescription medicine names, treatment outcome claims, or readable regulated-health advertising claims.`,
    shot.criticalConstraints?.length ? `Shot-specific constraints: ${shot.criticalConstraints.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function getArg(name: string) {
  const prefix = `--${name}=`
  const direct = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
  if (direct) return direct
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function relativeToProject(filepath: string) {
  return path.relative(process.cwd(), filepath)
}

function publicUrl(filepath: string) {
  return `/${path.relative(path.join(process.cwd(), "public"), filepath).replaceAll(path.sep, "/")}`
}

function publicFilePathFromUrl(url: string) {
  return path.join(process.cwd(), "public", url.replace(/^\//, ""))
}

function bytesLabel(bytes: number) {
  return `${Math.round(bytes / 1024)}KB`
}

async function writeWebpCrop({
  sourcePath,
  outputPath,
  width,
  height,
  maxBytes = WEBP_TARGET_BYTES,
}: {
  sourcePath: string
  outputPath: string
  width: number
  height: number
  maxBytes?: number
}): Promise<WrittenAsset> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  let selectedQuality = 85
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "instantmed-webp-"))
  const cropPath = path.join(tmpDir, `${path.basename(outputPath, ".webp")}.png`)

  try {
    await sharp(sourcePath)
      .resize(width, height, { fit: "cover", position: sharp.strategy.attention })
      .png()
      .toFile(cropPath)

    for (let quality = 85; quality >= 58; quality -= 3) {
      await execFileAsync("cwebp", ["-quiet", "-q", String(quality), "-m", "6", cropPath, "-o", outputPath])
      selectedQuality = quality

      const stats = await fs.stat(outputPath)
      if (stats.size <= maxBytes) break
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }

  await attachWebpDisclosure(outputPath)

  const stats = await fs.stat(outputPath)
  return {
    path: publicUrl(outputPath),
    width,
    height,
    bytes: stats.size,
    quality: selectedQuality,
  }
}

async function writeJpgCrop({
  sourcePath,
  outputPath,
  width,
  height,
}: {
  sourcePath: string
  outputPath: string
  width: number
  height: number
}): Promise<WrittenAsset> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await sharp(sourcePath)
    .resize(width, height, { fit: "cover", position: sharp.strategy.attention })
    .jpeg({ quality: 84, mozjpeg: true })
    .withMetadata({
      exif: {
        IFD0: {
          ImageDescription: aiDisclosure,
          Software: "GPT-image-2 via Vercel AI Gateway",
        },
      },
    })
    .toFile(outputPath)

  const stats = await fs.stat(outputPath)
  return {
    path: publicUrl(outputPath),
    width,
    height,
    bytes: stats.size,
    quality: 84,
  }
}

function xmpDisclosure() {
  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <xmp:CreatorTool>GPT-image-2 via Vercel AI Gateway</xmp:CreatorTool>
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${aiDisclosure}</rdf:li>
        </rdf:Alt>
      </dc:description>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`
}

async function attachWebpDisclosure(filepath: string) {
  const xmpPath = `${filepath}.xmp`
  const tmpPath = `${filepath}.tmp.webp`

  try {
    await fs.writeFile(xmpPath, xmpDisclosure(), "utf8")
    await execFileAsync("webpmux", ["-set", "xmp", xmpPath, filepath, "-o", tmpPath])
    await fs.rename(tmpPath, filepath)
  } catch (error) {
    console.warn(`Could not attach XMP disclosure to ${relativeToProject(filepath)}: ${(error as Error).message}`)
    await fs.rm(tmpPath, { force: true })
  } finally {
    await fs.rm(xmpPath, { force: true })
  }
}

async function generateSource(shot: ShotSpec, force: boolean) {
  const outputPath = path.join(SOURCE_DIR, `${shot.id}.png`)
  if (!force) {
    try {
      await fs.access(outputPath)
      console.log(`Using existing source ${relativeToProject(outputPath)}`)
      return outputPath
    } catch {
      // Missing source is expected.
    }
  }

  await fs.mkdir(SOURCE_DIR, { recursive: true })
  const prompt = buildPrompt(shot)
  console.log(`Generating ${shot.id} with ${GPT_IMAGE_MODEL} (${SOURCE_SIZE})...`)

  const result = await generateImage({
    model: gateway.image(GPT_IMAGE_MODEL),
    prompt,
    size: SOURCE_SIZE,
    providerOptions: {
      gateway: {
        tags: ["feature:marketing-photography", `shot:${shot.id}`, "renderer:gpt-image-2"],
      },
    },
  })

  await sharp(Buffer.from(result.image.uint8Array)).png().toFile(outputPath)
  return outputPath
}

async function processShot(shot: ShotSpec, sourcePath: string): Promise<ShotManifest> {
  const base = shot.filename.replace(/\.webp$/, "")
  const banner16x9 = await writeWebpCrop({
    sourcePath,
    outputPath: path.join(PUBLIC_IMAGE_DIR, shot.filename),
    width: 1920,
    height: 1080,
    maxBytes: WEBP_TARGET_WITH_METADATA_HEADROOM,
  })
  const accent4x3 = await writeWebpCrop({
    sourcePath,
    outputPath: path.join(PUBLIC_IMAGE_DIR, `${base}-4x3.webp`),
    width: 1600,
    height: 1200,
    maxBytes: 220 * 1024,
  })
  const social1x1 = await writeWebpCrop({
    sourcePath,
    outputPath: path.join(PUBLIC_IMAGE_DIR, `${base}-1x1.webp`),
    width: 1200,
    height: 1200,
    maxBytes: 180 * 1024,
  })
  const ogWebp = await writeWebpCrop({
    sourcePath,
    outputPath: path.join(PUBLIC_IMAGE_DIR, `${base}-og.webp`),
    width: 1200,
    height: 630,
    maxBytes: 155 * 1024,
  })
  const ogJpg = await writeJpgCrop({
    sourcePath,
    outputPath: path.join(PUBLIC_IMAGE_DIR, `${base}-og.jpg`),
    width: 1200,
    height: 630,
  })

  return {
    ...shot,
    aiDisclosure,
    generator: GPT_IMAGE_MODEL,
    sourceSize: SOURCE_SIZE,
    assets: {
      banner16x9,
      accent4x3,
      social1x1,
      ogWebp,
      ogJpg,
    },
  }
}

async function writeManifest(manifest: ShotManifest[]) {
  const payload = {
    generatedAt: new Date().toISOString(),
    generator: GPT_IMAGE_MODEL,
    aiDisclosure,
    notes: [
      "Generated humans are synthetic and must not be presented as real patients, testimonials, pharmacists, or practitioners.",
      "Use static images only. Do not add parallax, auto-zoom, or motion effects.",
      "Alt text lives beside each asset entry in this manifest.",
    ],
    shots: manifest,
  }

  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(payload, null, 2)}\n`)
}

async function writeContactSheet(manifest: ShotManifest[]) {
  const tileWidth = 480
  const tileHeight = 270
  const labelHeight = 46
  const gap = 18
  const columns = 2
  const rows = Math.ceil(manifest.length / columns)
  const width = columns * tileWidth + (columns + 1) * gap
  const height = rows * (tileHeight + labelHeight) + (rows + 1) * gap

  const composites: sharp.OverlayOptions[] = []
  for (const [index, shot] of manifest.entries()) {
    const column = index % columns
    const row = Math.floor(index / columns)
    const left = gap + column * (tileWidth + gap)
    const top = gap + row * (tileHeight + labelHeight + gap)
    const filePath = publicFilePathFromUrl(shot.assets.banner16x9.path)
    const tile = await sharp(filePath).resize(tileWidth, tileHeight, { fit: "cover" }).toBuffer()
    const label = Buffer.from(`
      <svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#F8F7F4"/>
        <text x="0" y="20" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1A1A2E">${shot.id}</text>
        <text x="0" y="39" font-family="Arial, sans-serif" font-size="13" fill="#6B7280">${bytesLabel(shot.assets.banner16x9.bytes)} at q${shot.assets.banner16x9.quality}</text>
      </svg>
    `)
    composites.push({ input: tile, left, top })
    composites.push({ input: label, left, top: top + tileHeight + 6 })
  }

  await fs.mkdir(path.dirname(CONTACT_SHEET_PATH), { recursive: true })
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#F8F7F4",
    },
  })
    .composite(composites)
    .webp({ quality: 84, effort: 5 })
    .toFile(CONTACT_SHEET_PATH)
}

async function main() {
  assertGatewayAuth()

  const id = getArg("id")
  const force = hasFlag("force")
  const dryRun = hasFlag("dry-run")
  const selected = id ? shots.filter((shot) => shot.id === id) : shots
  if (id && selected.length === 0) throw new Error(`Unknown shot id "${id}"`)

  if (dryRun) {
    for (const shot of selected) {
      console.log(`\n--- ${shot.id} ---\n${buildPrompt(shot)}`)
    }
    return
  }

  const existingManifest = !id
    ? []
    : await fs
        .readFile(MANIFEST_PATH, "utf8")
        .then((contents) => JSON.parse(contents).shots as ShotManifest[])
        .catch(() => [])

  const untouched = id ? existingManifest.filter((entry) => entry.id !== id) : []
  const manifest: ShotManifest[] = [...untouched]

  for (const shot of selected) {
    const sourcePath = await generateSource(shot, force)
    const processed = await processShot(shot, sourcePath)
    manifest.push(processed)

    console.log(
      `Saved ${shot.id}: ${processed.assets.banner16x9.path} ${bytesLabel(processed.assets.banner16x9.bytes)} q${processed.assets.banner16x9.quality}`,
    )
  }

  manifest.sort((a, b) => shots.findIndex((shot) => shot.id === a.id) - shots.findIndex((shot) => shot.id === b.id))
  await writeManifest(manifest)
  await writeContactSheet(manifest)

  console.log(`Wrote ${relativeToProject(MANIFEST_PATH)}`)
  console.log(`Wrote ${relativeToProject(CONTACT_SHEET_PATH)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
