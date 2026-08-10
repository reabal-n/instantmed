import type { Metadata } from "next"

import { DEFAULT_APP_URL } from "@/lib/constants"
import { ICEBOX_ROBOTS } from "@/lib/seo/index-policy"

import { BreadcrumbSchema } from "./schemas/breadcrumb"
import { FAQSchema } from "./schemas/faq"

type ProgrammaticPathname = `/${string}`
type ProgrammaticEntryGetter = (slug: string) => unknown
type ProgrammaticEntry<GetEntry extends ProgrammaticEntryGetter> = Exclude<
  ReturnType<GetEntry>,
  null | undefined
>

interface ProgrammaticPageProps<ParamKey extends string> {
  params: Promise<Record<ParamKey, string>>
}

type ProgrammaticFaq =
  | { a: string; q: string }
  | { answer: string; question: string }

interface ProgrammaticBreadcrumb {
  name: string
  pathname: ProgrammaticPathname
}

interface ProgrammaticMetadataDefinition {
  description: string
  keywords?: Metadata["keywords"]
  openGraph: {
    description?: string
    title: string
    type?: "article" | "website"
  }
  title: NonNullable<Metadata["title"]>
  twitter?: Metadata["twitter"]
}

interface ProgrammaticPageContext<Entry> {
  canonical: string
  entry: Entry
  pathname: ProgrammaticPathname
  slug: string
}

interface ProgrammaticSeoRouteDefinition<ParamKey extends string, Entry> {
  basePath: ProgrammaticPathname
  breadcrumb: {
    current: (context: ProgrammaticPageContext<NoInfer<Entry>>) => string
    parent: ProgrammaticBreadcrumb
  }
  faqs: (context: ProgrammaticPageContext<NoInfer<Entry>>) => readonly ProgrammaticFaq[]
  getEntry: (slug: string) => Entry | undefined
  getSlugs: () => readonly string[]
  indexable: (context: ProgrammaticPageContext<NoInfer<Entry>>) => boolean
  metadata: (
    context: ProgrammaticPageContext<NoInfer<Entry>>,
  ) => ProgrammaticMetadataDefinition
  param: ParamKey
}

interface ProgrammaticSchemaData {
  breadcrumbs: Array<{ name: string; url: string }>
  faqs: Array<{ answer: string; question: string }>
}

interface ResolvedProgrammaticPage<Entry> extends ProgrammaticPageContext<Entry> {
  schemas: ProgrammaticSchemaData
}

const CANONICAL_PATH_SEGMENT = /^[A-Za-z0-9._~-]+$/

function isCanonicalPathSegment(value: unknown): value is string {
  return typeof value === "string"
    && value !== "."
    && value !== ".."
    && CANONICAL_PATH_SEGMENT.test(value)
}

function absoluteSiteUrl(pathname: ProgrammaticPathname): string {
  if (
    !pathname.startsWith("/")
    || pathname.startsWith("//")
    || pathname.includes("?")
    || pathname.includes("#")
  ) {
    throw new Error("Programmatic SEO pathname must be a root-relative path")
  }

  const siteOrigin = new URL(DEFAULT_APP_URL).origin
  const url = new URL(pathname, `${DEFAULT_APP_URL}/`)
  if (url.origin !== siteOrigin) {
    throw new Error("Programmatic SEO pathname must stay on the canonical site")
  }
  if (url.pathname !== pathname) {
    throw new Error(
      "Programmatic SEO pathname must not require URL normalization",
    )
  }
  return url.toString()
}

function normalizeFaqs(
  faqs: readonly ProgrammaticFaq[],
): Array<{ answer: string; question: string }> {
  return faqs.map((faq) => (
    "question" in faq
      ? faq
      : { answer: faq.a, question: faq.q }
  ))
}

function metadataFor(
  definition: ProgrammaticMetadataDefinition,
  canonical: string,
  indexable: boolean,
): Metadata {
  const openGraphBase = {
    description: definition.openGraph.description ?? definition.description,
    title: definition.openGraph.title,
    url: canonical,
  }
  const openGraph = definition.openGraph.type === "article"
    ? { ...openGraphBase, type: "article" as const }
    : definition.openGraph.type === "website"
      ? { ...openGraphBase, type: "website" as const }
      : openGraphBase

  return {
    alternates: { canonical },
    description: definition.description,
    ...(definition.keywords !== undefined
      ? { keywords: definition.keywords }
      : {}),
    openGraph,
    robots: indexable
      ? { follow: true, index: true }
      : ICEBOX_ROBOTS,
    title: definition.title,
    ...(definition.twitter !== undefined
      ? { twitter: definition.twitter }
      : {}),
  }
}

/**
 * Defines one programmatic route family. The route owns its copy, layout, and
 * specialised schema; this module derives lookup, static params, canonical and
 * OpenGraph URLs, robots policy, FAQ normalization, and breadcrumb schema from
 * one path/slug definition. Unsafe request slugs resolve to null; an unsafe
 * configured static slug throws so the build cannot publish a drifting URL.
 */
export function defineProgrammaticSeoRoute<
  const ParamKey extends string,
  GetEntry extends ProgrammaticEntryGetter,
>(
  definition: Omit<
    ProgrammaticSeoRouteDefinition<ParamKey, ProgrammaticEntry<GetEntry>>,
    "getEntry"
  > & { getEntry: GetEntry },
) {
  const basePath = definition.basePath.replace(/\/$/, "") as ProgrammaticPathname
  absoluteSiteUrl(basePath)
  absoluteSiteUrl(definition.breadcrumb.parent.pathname)

  async function resolve(
    params: ProgrammaticPageProps<ParamKey>["params"],
  ): Promise<ResolvedProgrammaticPage<ProgrammaticEntry<GetEntry>> | null> {
    const values = await params
    const slug = values[definition.param]
    if (!isCanonicalPathSegment(slug)) {
      return null
    }

    const entry = definition.getEntry(slug) as
      | ProgrammaticEntry<GetEntry>
      | null
      | undefined
    if (!entry) return null

    const pathname = `${basePath}/${slug}` as ProgrammaticPathname
    const canonical = absoluteSiteUrl(pathname)
    const context = { canonical, entry, pathname, slug }

    return {
      ...context,
      schemas: {
        breadcrumbs: [
          { name: "Home", url: DEFAULT_APP_URL },
          {
            name: definition.breadcrumb.parent.name,
            url: absoluteSiteUrl(definition.breadcrumb.parent.pathname),
          },
          {
            name: definition.breadcrumb.current(context),
            url: canonical,
          },
        ],
        faqs: normalizeFaqs(definition.faqs(context)),
      },
    }
  }

  async function generateMetadata(
    props: ProgrammaticPageProps<ParamKey>,
  ): Promise<Metadata> {
    const page = await resolve(props.params)
    if (!page) return {}

    return metadataFor(
      definition.metadata(page),
      page.canonical,
      definition.indexable(page),
    )
  }

  function generateStaticParams(): Array<Record<ParamKey, string>> {
    return definition.getSlugs().map((slug) => {
      if (!isCanonicalPathSegment(slug)) {
        throw new Error(
          `Programmatic SEO slug must be one canonical path segment: ${slug}`,
        )
      }

      return { [definition.param]: slug } as Record<ParamKey, string>
    })
  }

  return {
    generateMetadata,
    generateStaticParams,
    resolve,
  }
}

export function ProgrammaticPageSchemas({
  page,
}: {
  page: ResolvedProgrammaticPage<unknown>
}) {
  return (
    <>
      <FAQSchema faqs={page.schemas.faqs} />
      <BreadcrumbSchema items={page.schemas.breadcrumbs} />
    </>
  )
}
