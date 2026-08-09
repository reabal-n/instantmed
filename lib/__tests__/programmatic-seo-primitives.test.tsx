import { readFileSync } from "node:fs"
import path from "node:path"

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  defineProgrammaticSeoRoute,
  ProgrammaticPageSchemas,
} from "@/components/seo/programmatic-page"

const PROGRAMMATIC_ROUTE_FILES = [
  "app/conditions/[slug]/page.tsx",
  "app/symptoms/[slug]/page.tsx",
  "app/guides/[slug]/page.tsx",
  "app/compare/[slug]/page.tsx",
  "app/intent/[slug]/page.tsx",
  "app/locations/[city]/page.tsx",
  "app/locations/state/[state]/page.tsx",
  "app/for/[audience]/page.tsx",
  "app/for/employers/[company]/page.tsx",
] as const

const entries = {
  indexed: {
    description: "A source-backed condition guide.",
    label: "Indexed guide",
    q: "Indexed question?",
  },
  iceboxed: {
    description: "An intentionally iceboxed guide.",
    label: "Iceboxed guide",
    q: "Iceboxed question?",
  },
}

const getSampleEntry = (slug: string) => entries[slug as keyof typeof entries]

const seoRoute = defineProgrammaticSeoRoute({
  basePath: "/conditions",
  breadcrumb: {
    current: ({ entry }) => entry.label,
    parent: { name: "Conditions", pathname: "/conditions" },
  },
  faqs: ({ entry }) => [{ a: "Shared answer.", q: entry.q }],
  getEntry: getSampleEntry,
  getSlugs: () => Object.keys(entries),
  indexable: ({ slug }) => slug === "indexed",
  metadata: ({ entry }) => ({
    description: entry.description,
    keywords: ["condition guide"],
    openGraph: {
      description: `Social: ${entry.description}`,
      title: `${entry.label} | InstantMed`,
      type: "article",
    },
    title: { absolute: `${entry.label} | InstantMed` },
  }),
  param: "slug",
})

describe("programmatic SEO route module", () => {
  it("derives static params, canonical, OpenGraph, and robots from one route definition", async () => {
    expect(seoRoute.generateStaticParams()).toEqual([
      { slug: "indexed" },
      { slug: "iceboxed" },
    ])

    const indexed = await seoRoute.generateMetadata({
      params: Promise.resolve({ slug: "indexed" }),
    })
    expect(indexed.robots).toEqual({ index: true, follow: true })
    expect(indexed.alternates).toEqual({
      canonical: "https://instantmed.com.au/conditions/indexed",
    })
    expect(indexed.openGraph).toMatchObject({
      description: "Social: A source-backed condition guide.",
      title: "Indexed guide | InstantMed",
      type: "article",
      url: "https://instantmed.com.au/conditions/indexed",
    })

    const iceboxed = await seoRoute.generateMetadata({
      params: Promise.resolve({ slug: "iceboxed" }),
    })
    expect(iceboxed.robots).toEqual({ index: false, follow: true })
    expect(iceboxed.alternates).toEqual({
      canonical: "https://instantmed.com.au/conditions/iceboxed",
    })
  })

  it("resolves normalized schema inputs from the same canonical leaf", async () => {
    const resolved = await seoRoute.resolve(Promise.resolve({ slug: "indexed" }))
    expect(resolved).not.toBeNull()

    const html = renderToStaticMarkup(
      <ProgrammaticPageSchemas page={resolved!} />,
    )

    expect(resolved).toMatchObject({
      canonical: "https://instantmed.com.au/conditions/indexed",
      pathname: "/conditions/indexed",
      slug: "indexed",
    })
    expect(html).toContain('"name":"Indexed question?"')
    expect(html).toContain('"text":"Shared answer."')
    expect(html).toContain('"position":1,"name":"Home","item":"https://instantmed.com.au"')
    expect(html).toContain('"position":2,"name":"Conditions","item":"https://instantmed.com.au/conditions"')
    expect(html).toContain('"position":3,"name":"Indexed guide","item":"https://instantmed.com.au/conditions/indexed"')
  })

  it("returns empty metadata and no page for an unknown slug", async () => {
    const params = Promise.resolve({ slug: "unknown" })

    await expect(seoRoute.generateMetadata({ params })).resolves.toEqual({})
    await expect(seoRoute.resolve(params)).resolves.toBeNull()
  })

  it("rejects an absolute or protocol-relative base path", () => {
    for (const basePath of ["https://example.com/page", "//example.com/page"]) {
      expect(() => defineProgrammaticSeoRoute({
        ...{
          basePath: basePath as `/${string}`,
          breadcrumb: {
            current: () => "Unsafe",
            parent: { name: "Unsafe", pathname: "/unsafe" as const },
          },
          faqs: () => [],
          getEntry: () => ({ label: "Unsafe" }),
          getSlugs: () => ["unsafe"],
          indexable: () => false,
          metadata: () => ({
            description: "Unsafe canonical input",
            openGraph: { title: "Unsafe" },
            title: "Unsafe",
          }),
          param: "slug" as const,
        },
      })).toThrow("Programmatic SEO pathname")
    }
  })

  it("keeps every programmatic family on the shared policy seam", () => {
    for (const relativePath of PROGRAMMATIC_ROUTE_FILES) {
      const source = readFileSync(path.join(process.cwd(), relativePath), "utf8")

      expect(source, relativePath).toContain("defineProgrammaticSeoRoute")
      expect(source, relativePath).toContain("seoRoute.generateMetadata")
      expect(source, relativePath).toContain("seoRoute.generateStaticParams")
      expect(source, relativePath).toContain("seoRoute.resolve")
      expect(source, relativePath).toContain("<ProgrammaticPageSchemas")
      expect(source, relativePath).not.toContain("<FAQSchema")
      expect(source, relativePath).not.toContain("<BreadcrumbSchema")
    }
  })
})
