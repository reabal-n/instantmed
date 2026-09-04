import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime"
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import ConditionPage from "@/app/conditions/[slug]/page"
import SymptomPage from "@/app/symptoms/[slug]/page"
import { ArticleTemplate } from "@/components/blog/article-template"
import { OnlinePrescriptionsLanding } from "@/components/marketing/online-prescriptions-landing"
import { ServiceAvailabilityProvider } from "@/components/providers/service-availability-provider"
import { loadAllMDXArticles } from "@/lib/blog/mdx"
import type { Article, ArticleIndexItem } from "@/lib/blog/types"
import { symptoms } from "@/lib/seo/data/symptoms"
import { SupabaseAuthProvider } from "@/lib/supabase/auth-provider"

const INSTANTMED_HOSTS = new Set(["instantmed.com.au", "www.instantmed.com.au"])
const ACQUISITION_ROOTS = [
  "/consult",
  "/contraceptive-pill-assessment-online",
  "/erectile-dysfunction",
  "/hair-loss",
  "/intent",
  "/medical-certificate",
  "/medical-certificate-online",
  "/prescriptions",
  "/pricing",
  "/request",
  "/uti-assessment-online",
  "/weight-loss",
] as const

interface RenderedAnchor {
  href: string
  rel: string | null
}

const TEST_ROUTER: AppRouterInstance = {
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
  push: () => undefined,
  replace: () => undefined,
  prefetch: () => undefined,
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
}

function renderedAnchors(markup: string): RenderedAnchor[] {
  return [...markup.matchAll(/<a\b([^>]*)>/gi)].flatMap((match) => {
    const attributes = match[1]
    const href = attributes.match(/\bhref=(?:"([^"]*)"|'([^']*)')/i)
    if (!href) return []

    const rel = attributes.match(/\brel=(?:"([^"]*)"|'([^']*)')/i)
    return [{
      href: decodeHtmlAttribute(href[1] ?? href[2]),
      rel: rel ? decodeHtmlAttribute(rel[1] ?? rel[2]) : null,
    }]
  })
}

function decodePathname(pathname: string): string {
  let decoded = pathname

  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    } catch {
      break
    }
  }

  return decoded
}

function resolveInstantMedPath(destination: string, guideSlug: string): string | null {
  try {
    const base = `https://instantmed.com.au/blog/${guideSlug}`
    const destinationUrl = new URL(destination, base)
    if (!INSTANTMED_HOSTS.has(destinationUrl.hostname)) return null
    if (!["http:", "https:"].includes(destinationUrl.protocol)) return null

    const decodedPathname = decodePathname(destinationUrl.pathname)
    const normalizedPathname = new URL(decodedPathname, "https://instantmed.com.au").pathname
      .replace(/\/{2,}/g, "/")

    return normalizedPathname.length > 1
      ? normalizedPathname.replace(/\/$/, "")
      : normalizedPathname
  } catch {
    return null
  }
}

function isGuideAcquisitionDestination(destination: string, guideSlug: string): boolean {
  const pathname = resolveInstantMedPath(destination, guideSlug)
  if (!pathname) return false

  return ACQUISITION_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  )
}

function findGuideAcquisitionLinks(markup: string, guideSlug: string): string[] {
  return renderedAnchors(markup)
    .filter(({ href }) => isGuideAcquisitionDestination(href, guideSlug))
    .map(({ href }) => href)
}

function hasFollowablePrescriptionsAnchor(markup: string, pageSlug: string): boolean {
  return renderedAnchors(markup).some(({ href, rel }) => {
    const pathname = resolveInstantMedPath(href, pageSlug)
    const relTokens = new Set(rel?.toLowerCase().split(/\s+/).filter(Boolean) ?? [])
    return pathname === "/prescriptions" && !relTokens.has("nofollow")
  })
}

function renderPublicSurface(element: React.ReactElement, pathname: string): string {
  return renderToStaticMarkup(
    React.createElement(
      AppRouterContext.Provider,
      { value: TEST_ROUTER },
      React.createElement(
        PathnameContext.Provider,
        { value: pathname },
        React.createElement(
          SupabaseAuthProvider,
          null,
          React.createElement(ServiceAvailabilityProvider, null, element),
        ),
      ),
    ),
  )
}

function articleIndexItem(slug: string, order?: number): ArticleIndexItem {
  return {
    slug,
    title: `Guide ${slug}`,
    excerpt: "A neutral educational guide.",
    category: "telehealth",
    tags: ["telehealth"],
    keywords: ["telehealth"],
    updatedAt: "2026-08-28",
    readingTime: 5,
    viewCount: 10,
    authorName: "InstantMed editorial team",
    heroImage: "/images/blog/telehealth-guide.webp",
    heroImageAlt: "A neutral educational diagram",
    series: order === undefined ? undefined : { id: "crawl-contract", order },
  }
}

const MAXIMAL_GUIDE: Article = {
  slug: "crawl-contract-guide",
  title: "Crawl contract guide",
  subtitle: "A neutral educational fixture",
  excerpt: "A neutral educational fixture for the guide renderer.",
  category: "telehealth",
  tags: ["telehealth"],
  publishedAt: "2026-08-28",
  updatedAt: "2026-08-28",
  readingTime: 5,
  viewCount: 10,
  author: {
    name: "InstantMed editorial team",
    credentials: "",
    ahpraNumber: "",
    bio: "Editorial fixture",
  },
  heroImage: "/images/blog/telehealth-guide.webp",
  heroImageAlt: "A neutral educational diagram",
  content: [
    { type: "heading", level: 2, content: "Overview" },
    {
      type: "paragraph",
      content: "Read a blog guide, condition page, or symptom page.",
      links: [
        { text: "blog guide", href: "/blog/telehealth-safety" },
        { text: "condition page", href: "/conditions/asthma" },
        { text: "symptom page", href: "/symptoms/cough" },
      ],
    },
    { type: "heading", level: 2, content: "What to consider" },
    { type: "paragraph", content: "General educational context." },
    { type: "heading", level: 3, content: "A closer look" },
    { type: "list", content: "", items: ["One consideration"] },
    { type: "steps", content: "", items: ["First step", "Second step"] },
    {
      type: "table",
      content: "",
      headers: ["Topic", "Context"],
      rows: [["Review", "General information"]],
    },
    { type: "callout", variant: "info", content: "General information only." },
    { type: "keyTakeaway", title: "Key takeaway", content: "Read the care boundaries." },
    {
      type: "decisionBox",
      title: "Decision guide",
      content: "",
      groups: [
        { title: "May fit telehealth", items: ["Straightforward context"] },
        { title: "Needs in-person care", items: ["Physical examination needed"] },
        { title: "Urgent care", items: ["Emergency symptoms"] },
      ],
    },
    { type: "evidenceNote", title: "Evidence note", content: "Review official sources." },
    { type: "policyNote", title: "Policy note", content: "Policies can vary." },
    { type: "heading", level: 2, content: "Care boundaries" },
    { type: "careBoundary", content: "Seek urgent care when needed." },
    { type: "heading", level: 2, content: "Sources" },
    { type: "paragraph", content: "Official sources are listed here." },
  ],
  faqs: [{ question: "Is this medical advice?", answer: "No. It is general information." }],
  relatedArticles: ["related-guide"],
  series: {
    id: "crawl-contract",
    name: "Crawl contract series",
    description: "Neutral educational fixtures",
    order: 1,
  },
  seo: {
    title: "Crawl contract guide",
    description: "A neutral educational fixture.",
    keywords: ["telehealth"],
  },
}

function renderMaximalGuide(): string {
  return renderToStaticMarkup(
    React.createElement(ArticleTemplate, {
      article: MAXIMAL_GUIDE,
      relatedArticles: [articleIndexItem("related-guide")],
      seriesArticles: [
        articleIndexItem(MAXIMAL_GUIDE.slug, 1),
        articleIndexItem("next-series-guide", 2),
      ],
      popularArticles: [articleIndexItem("popular-guide")],
      articleVisuals: [{
        id: "crawl-contract-visual",
        title: "Educational pathway",
        eyebrow: "Guide visual",
        summary: "A neutral educational pathway.",
        kind: "flow",
        accent: "blue",
        items: [{ label: "Read", detail: "Review general information." }],
      }],
    }),
  )
}

describe("health-guide acquisition link contract", () => {
  it("normalizes adversarial guide destinations without blocking educational or external links", () => {
    const serviceHref = "/prescriptions"
    const markup = renderToStaticMarkup(
      React.createElement(
        "article",
        null,
        React.createElement("a", { href: serviceHref }, "Const-backed service"),
        React.createElement("a", { href: "../../prescriptions" }, "Relative service"),
        React.createElement(
          "a",
          { href: "//instantmed.com.au/request?service=repeat-script" },
          "Protocol-relative request",
        ),
        React.createElement(
          "a",
          { href: "https://www.instantmed.com.au/%68air-loss" },
          "Encoded same-site service",
        ),
        React.createElement("a", { href: "/blog/telehealth-safety" }, "Blog guide"),
        React.createElement("a", { href: "/conditions/asthma" }, "Condition"),
        React.createElement("a", { href: "/symptoms/cough" }, "Symptom"),
        React.createElement(
          "a",
          { href: "https://example.com/request" },
          "External request path",
        ),
      ),
    )

    expect(findGuideAcquisitionLinks(markup, "fixture-guide")).toEqual([
      "/prescriptions",
      "../../prescriptions",
      "//instantmed.com.au/request?service=repeat-script",
      "https://www.instantmed.com.au/%68air-loss",
    ])
  })

  it("keeps parsed guide-body links and every rendered template branch education-only", () => {
    const parsedGuideViolations = loadAllMDXArticles().flatMap((article) =>
      article.content.flatMap((section) =>
        (section.links ?? []).flatMap((link) =>
          isGuideAcquisitionDestination(link.href, article.slug)
            ? [`${article.slug}: ${link.href}`]
            : [],
        ),
      ),
    )
    const templateMarkup = renderMaximalGuide()
    const renderedPaths = renderedAnchors(templateMarkup)
      .map(({ href }) => resolveInstantMedPath(href, MAXIMAL_GUIDE.slug))
      .filter((pathname): pathname is string => pathname !== null)

    expect(parsedGuideViolations).toEqual([])
    expect(findGuideAcquisitionLinks(templateMarkup, MAXIMAL_GUIDE.slug)).toEqual([])
    expect(renderedPaths).toEqual(expect.arrayContaining([
      "/blog/telehealth-safety",
      "/conditions/asthma",
      "/symptoms/cough",
      "/blog/related-guide",
      "/blog/next-series-guide",
      "/blog/popular-guide",
    ]))
  })

  it("renders a followable prescriptions anchor on each representative non-guide surface", async () => {
    const onlinePrescriptionsMarkup = renderPublicSurface(
      React.createElement(OnlinePrescriptionsLanding, { visuals: [] }),
      "/online-prescriptions",
    )
    const conditionMarkup = renderPublicSurface(
      await ConditionPage({ params: Promise.resolve({ slug: "cold-and-flu" }) }),
      "/conditions/cold-and-flu",
    )
    const relatedSymptomMarkup = renderPublicSurface(
      await SymptomPage({ params: Promise.resolve({ slug: "sore-throat" }) }),
      "/symptoms/sore-throat",
    )

    const fixtureSlug = "crawl-contract-no-related"
    symptoms[fixtureSlug] = {
      ...symptoms["sore-throat"],
      slug: fixtureSlug,
      name: "Crawl contract symptom",
      relatedSymptoms: [],
    }

    let fallbackSymptomMarkup: string
    try {
      fallbackSymptomMarkup = renderPublicSurface(
        await SymptomPage({ params: Promise.resolve({ slug: fixtureSlug }) }),
        `/symptoms/${fixtureSlug}`,
      )
    } finally {
      delete symptoms[fixtureSlug]
    }

    expect(hasFollowablePrescriptionsAnchor(onlinePrescriptionsMarkup, "online-prescriptions")).toBe(true)
    expect(hasFollowablePrescriptionsAnchor(conditionMarkup, "conditions/cold-and-flu")).toBe(true)
    expect(hasFollowablePrescriptionsAnchor(relatedSymptomMarkup, "symptoms/sore-throat")).toBe(true)
    expect(hasFollowablePrescriptionsAnchor(fallbackSymptomMarkup, `symptoms/${fixtureSlug}`)).toBe(true)
  })
})
