import Link from "next/link"

import { BRANDED_SEARCH_LINKS } from "@/lib/seo/branded-search-links"

/**
 * Server-rendered shortcuts to the most useful branded-search destinations.
 *
 * Google chooses organic sitelinks automatically. A compact, consistent set of
 * plain-language internal anchors gives both patients and crawlers a clearer
 * hierarchy than promoting SEO pillar pages or individual locations here.
 *
 * Compliance: neutral, descriptive anchor text only, with no drug names, prices,
 * or outcome claims. See docs/SEO_CONTENT_POLICY.md §5.
 */
function LinkRow({ links }: { links: typeof BRANDED_SEARCH_LINKS }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-sm text-muted-foreground">
      {links.map((link, i) => (
        <li key={link.href} className="flex items-center gap-x-2">
          {i > 0 && (
            <span aria-hidden="true" className="text-border">
              &middot;
            </span>
          )}
          <Link
            href={link.href}
            className="rounded-sm underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:text-primary focus-visible:underline"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function HomeServiceLinks() {
  return (
    <nav
      aria-label="Learn more about InstantMed"
      className="border-t border-border/30 bg-muted/20 py-8 dark:bg-white/[0.02]"
    >
      <div className="mx-auto max-w-4xl space-y-2 px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/70">
          Popular pages
        </p>
        <LinkRow links={BRANDED_SEARCH_LINKS} />
      </div>
    </nav>
  )
}
