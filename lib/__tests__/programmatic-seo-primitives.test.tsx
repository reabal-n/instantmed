import { readFileSync } from "node:fs"
import path from "node:path"

import type { Metadata } from "next"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  defineProgrammaticSeoRoute,
  ProgrammaticPageSchemas,
} from "@/components/seo/programmatic-page"

const PROGRAMMATIC_ROUTE_CASES = [
  {
    basePath: "/conditions",
    index: true,
    load: () => import("@/app/conditions/[slug]/page"),
    param: "slug",
    relativePath: "app/conditions/[slug]/page.tsx",
    slug: "cold-and-flu",
  },
  {
    basePath: "/symptoms",
    index: false,
    load: () => import("@/app/symptoms/[slug]/page"),
    param: "slug",
    relativePath: "app/symptoms/[slug]/page.tsx",
    slug: "sore-throat",
  },
  {
    basePath: "/guides",
    index: false,
    load: () => import("@/app/guides/[slug]/page"),
    param: "slug",
    relativePath: "app/guides/[slug]/page.tsx",
    slug: "how-to-get-medical-certificate-for-work",
  },
  {
    basePath: "/compare",
    index: false,
    load: () => import("@/app/compare/[slug]/page"),
    param: "slug",
    relativePath: "app/compare/[slug]/page.tsx",
    slug: "telehealth-vs-gp",
  },
  {
    basePath: "/intent",
    index: false,
    load: () => import("@/app/intent/[slug]/page"),
    param: "slug",
    relativePath: "app/intent/[slug]/page.tsx",
    slug: "same-day-medical-certificate",
  },
  {
    basePath: "/locations",
    index: true,
    load: () => import("@/app/locations/[city]/page"),
    param: "city",
    relativePath: "app/locations/[city]/page.tsx",
    slug: "sydney",
  },
  {
    basePath: "/locations/state",
    index: false,
    load: () => import("@/app/locations/state/[state]/page"),
    param: "state",
    relativePath: "app/locations/state/[state]/page.tsx",
    slug: "nsw",
  },
  {
    basePath: "/for",
    index: false,
    load: () => import("@/app/for/[audience]/page"),
    param: "audience",
    relativePath: "app/for/[audience]/page.tsx",
    slug: "nurses",
  },
  {
    basePath: "/for/employers",
    index: false,
    load: () => import("@/app/for/employers/[company]/page"),
    param: "company",
    relativePath: "app/for/employers/[company]/page.tsx",
    slug: "woolworths",
  },
] as const

interface ProgrammaticRouteModule {
  generateMetadata(props: {
    params: Promise<Record<string, string>>
  }): Promise<Metadata>
  generateStaticParams(): Array<Record<string, string>>
}

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

  it("rejects request and configured slugs that cannot remain one canonical path segment", async () => {
    const route = defineProgrammaticSeoRoute({
      basePath: "/conditions",
      breadcrumb: {
        current: ({ entry }) => entry.label,
        parent: { name: "Conditions", pathname: "/conditions" },
      },
      faqs: () => [],
      getEntry: () => ({ label: "Unsafe guide" }),
      getSlugs: () => ["safe-guide", ".."],
      indexable: () => false,
      metadata: () => ({
        description: "Unsafe canonical input",
        openGraph: { title: "Unsafe guide" },
        title: "Unsafe guide",
      }),
      param: "slug",
    })

    for (const slug of [
      ".",
      "..",
      "%2e%2e",
      "%2Fescape",
      "nested/leaf",
      "nested\\leaf",
    ]) {
      await expect(
        route.resolve(Promise.resolve({ slug })),
        slug,
      ).resolves.toBeNull()
    }

    expect(() => route.generateStaticParams()).toThrow(
      "Programmatic SEO slug must be one canonical path segment",
    )
  })

  it("rejects a base path that is external or normalizes away from its definition", () => {
    for (const basePath of [
      "https://example.com/page",
      "//example.com/page",
      "/conditions/..",
      "/conditions/%2e%2e",
      "/conditions\\escape",
    ]) {
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
    for (const { relativePath } of PROGRAMMATIC_ROUTE_CASES) {
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

  it("keeps every route's static slug, URL, and robots policy aligned", async () => {
    for (const routeCase of PROGRAMMATIC_ROUTE_CASES) {
      const route = await routeCase.load() as unknown as ProgrammaticRouteModule
      const params = { [routeCase.param]: routeCase.slug }
      const canonical = `https://instantmed.com.au${routeCase.basePath}/${routeCase.slug}`

      expect(route.generateStaticParams(), routeCase.relativePath).toContainEqual(
        params,
      )

      const metadata = await route.generateMetadata({
        params: Promise.resolve(params),
      })
      expect(metadata.alternates?.canonical, routeCase.relativePath).toBe(
        canonical,
      )
      expect(metadata.openGraph?.url, routeCase.relativePath).toBe(canonical)
      expect(metadata.robots, routeCase.relativePath).toEqual({
        follow: true,
        index: routeCase.index,
      })
    }
  })
})
