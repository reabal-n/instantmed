import Link from "next/link"

/**
 * Server-rendered, raw-HTML navigation to the service landing pages and the two
 * head-term pillar pages.
 *
 * WHY THIS EXISTS (SEO / crawl demand): the homepage is the highest-authority,
 * most-crawled page on the domain, but its visual `ServiceCards` grid is loaded
 * via `next/dynamic` with a loading fallback, so those links ship only inside the
 * streamed RSC payload — not as raw `<a href>` in the pre-stream HTML. Several
 * money pages (`/prescriptions`, the pillars, `/verify`) are "Discovered –
 * currently not indexed / lastCrawl = NEVER" in GSC: Google found them via the
 * sitemap but won't spend crawl budget without a strong internal link. This block
 * is a plain server component (no "use client", no dynamic boundary) so its links
 * land in the static HTML of the single strongest page, creating real crawl
 * demand to the never-crawled landing pages with keyword-matched anchor text.
 *
 * Compliance: neutral, service-descriptive anchor text only (no drug names, no
 * prices, no outcome claims). All targets are active services. See
 * docs/SEO_CONTENT_POLICY.md §5.
 */

type ServiceLink = { label: string; href: string }

// Active patient services. Labels mirror the compliance-reviewed footer labels
// (lib/marketing/homepage.ts footerLinks.services) plus the live women's-health
// service (launched 2026-06-15). Weight loss is gated/reserved and excluded.
const SERVICE_LINKS: ServiceLink[] = [
  { label: "Medical certificates", href: "/medical-certificate" },
  { label: "Repeat prescriptions", href: "/prescriptions" },
  { label: "ED assessment", href: "/erectile-dysfunction" },
  { label: "Hair loss assessment", href: "/hair-loss" },
  { label: "Women's health", href: "/womens-health" },
]

// Head-term pillar pages + the employer verification tool. These have the
// weakest internal crawl demand on the whole site (the pillars were linked only
// from the never-crawled /resources pages).
const LEARN_MORE_LINKS: ServiceLink[] = [
  { label: "Online doctor in Australia", href: "/online-doctor-australia" },
  { label: "Telehealth in Australia", href: "/telehealth-australia" },
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
      aria-label="Browse services"
      className="border-t border-border/30 bg-muted/20 py-8 dark:bg-white/[0.02]"
    >
      <div className="mx-auto max-w-4xl space-y-4 px-4 sm:px-6 lg:px-8">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/70">
            Explore each service
          </p>
          <LinkRow links={SERVICE_LINKS} />
        </div>
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/70">
            Learn more
          </p>
          <LinkRow links={LEARN_MORE_LINKS} />
        </div>
      </div>
    </nav>
  )
}
