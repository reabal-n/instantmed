import Link from "next/link"

/**
 * Server-rendered, raw-HTML navigation to four supporting authority pages.
 *
 * The catalog-derived `PortfolioRouteMap` now owns the five active service links
 * in the server-rendered homepage. This quiet rail keeps only the pillar,
 * comparison, and certificate-verification links that are not represented there.
 *
 * Compliance: neutral, descriptive anchor text only, with no drug names, prices,
 * or outcome claims. See docs/SEO_CONTENT_POLICY.md §5.
 */

type ServiceLink = { label: string; href: string }

// Head-term pillar pages + the employer verification tool. These have the
// weakest internal crawl demand on the whole site (the pillars were linked only
// from the never-crawled /resources pages).
const LEARN_MORE_LINKS: ServiceLink[] = [
  { label: "Online doctor in Australia", href: "/online-doctor-australia" },
  { label: "Telehealth in Australia", href: "/telehealth-australia" },
  { label: "Compare certificate services", href: "/compare/online-medical-certificate-options" },
  { label: "Verify a certificate", href: "/verify" },
]

function LinkRow({ links }: { links: ServiceLink[] }) {
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
          Learn more
        </p>
        <LinkRow links={LEARN_MORE_LINKS} />
      </div>
    </nav>
  )
}
