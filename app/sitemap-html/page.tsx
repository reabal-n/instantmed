import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { MarketingFooter } from "@/components/marketing";
import { CenteredHero } from "@/components/heroes";
import { CTABanner } from "@/components/sections";
import { getAllConditionSlugs, getConditionBySlug } from "@/lib/seo/data/conditions";
import { symptoms } from "@/lib/seo/data/symptoms";
import { getGuideIndex } from "@/lib/seo/data/guides";
import { getAllComparisonSlugs } from "@/lib/seo/data/comparisons";
import { getAllIntentSlugs, getIntentPageBySlug } from "@/lib/seo/intents";
import { audiencePageConfigs } from "@/lib/seo/data/audience-pages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sitemap | InstantMed",
  description:
    "Browse all pages on InstantMed — medical certificates, prescriptions, consultations, health conditions, symptoms, and more.",
  alternates: { canonical: "https://instantmed.com.au/sitemap-html" },
  robots: { index: true, follow: true },
};

/** Convert a slug like "cold-and-flu" to "Cold And Flu" */
function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface SitemapSection {
  title: string;
  links: Array<{ label: string; href: string }>;
}

function buildSections(): SitemapSection[] {
  // Main Pages
  const mainPages: SitemapSection = {
    title: "Main Pages",
    links: [
      { label: "Home", href: "/" },
      { label: "Medical Certificates", href: "/medical-certificate" },
      { label: "Prescriptions", href: "/prescriptions" },
      { label: "General Consult", href: "/general-consult" },
      { label: "Pricing", href: "/pricing" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "FAQs", href: "/faq" },
      { label: "Contact", href: "/contact" },
      { label: "About Us", href: "/about" },
      { label: "Reviews", href: "/reviews" },
      { label: "Blog", href: "/blog" },
      { label: "Trust & Safety", href: "/trust" },
      { label: "Clinical Governance", href: "/clinical-governance" },
    ],
  };

  // Services
  const services: SitemapSection = {
    title: "Services",
    links: [
      { label: "Weight Loss", href: "/weight-loss" },
      { label: "Weight Loss", href: "/weight-loss" },
      { label: "Hair Loss", href: "/hair-loss" },
      { label: "Consult", href: "/consult" },
      { label: "Repeat Prescriptions", href: "/repeat-prescriptions" },
    ],
  };

  // Health Conditions
  const conditionSlugs = getAllConditionSlugs();
  const conditions: SitemapSection = {
    title: "Health Conditions",
    links: conditionSlugs.map((slug) => {
      const condition = getConditionBySlug(slug);
      return {
        label: condition?.name ?? slugToLabel(slug),
        href: `/conditions/${slug}`,
      };
    }),
  };

  // Symptoms
  const symptomEntries = Object.values(symptoms);
  const symptomsSection: SitemapSection = {
    title: "Symptoms",
    links: symptomEntries.map((s) => ({
      label: s.name,
      href: `/symptoms/${s.slug}`,
    })),
  };

  // Guides
  const guideIndex = getGuideIndex();
  const guides: SitemapSection = {
    title: "Guides",
    links: guideIndex.map((g) => ({
      label: g.title,
      href: `/guides/${g.slug}`,
    })),
  };

  // Comparisons
  const comparisonSlugs = getAllComparisonSlugs();
  const comparisons: SitemapSection = {
    title: "Comparisons",
    links: comparisonSlugs.map((slug) => ({
      label: slugToLabel(slug),
      href: `/compare/${slug}`,
    })),
  };

  // Locations
  const locationSlugs = [
    "sydney",
    "parramatta",
    "bondi-beach",
    "newcastle",
    "wollongong",
    "central-coast",
    "penrith",
    "melbourne",
    "geelong",
    "ballarat",
    "bendigo",
    "brisbane",
    "gold-coast",
    "sunshine-coast",
    "cairns",
    "townsville",
    "toowoomba",
    "perth",
    "fremantle",
    "adelaide",
    "hobart",
    "launceston",
    "darwin",
    "canberra",
  ];
  const locations: SitemapSection = {
    title: "Locations",
    links: locationSlugs.map((slug) => ({
      label: slugToLabel(slug),
      href: `/locations/${slug}`,
    })),
  };

  // For You (audience pages)
  const audienceSlugs = [
    "students",
    "tradies",
    "corporate",
    "shift-workers",
    ...Object.keys(audiencePageConfigs),
  ];
  // Deduplicate
  const uniqueAudienceSlugs = [...new Set(audienceSlugs)];
  const forYou: SitemapSection = {
    title: "For You",
    links: uniqueAudienceSlugs.map((slug) => {
      const config = audiencePageConfigs[slug];
      return {
        label: config?.badgeLabel?.replace("For ", "") ?? slugToLabel(slug),
        href: `/for/${slug}`,
      };
    }),
  };

  // Quick Answers (intent pages)
  const intentSlugs = getAllIntentSlugs();
  const quickAnswers: SitemapSection = {
    title: "Quick Answers",
    links: intentSlugs.map((slug) => {
      const page = getIntentPageBySlug(slug);
      return {
        label: page?.intent.searchQuery
          ? page.intent.searchQuery.charAt(0).toUpperCase() +
            page.intent.searchQuery.slice(1)
          : slugToLabel(slug),
        href: `/intent/${slug}`,
      };
    }),
  };

  // Legal
  const legal: SitemapSection = {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Trust & Safety", href: "/trust" },
    ],
  };

  return [
    mainPages,
    services,
    conditions,
    symptomsSection,
    guides,
    comparisons,
    locations,
    forYou,
    quickAnswers,
    legal,
  ];
}

export default function SitemapHtmlPage() {
  const sections = buildSections();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-20">
        <CenteredHero
          pill="Sitemap"
          title="Site Map"
          subtitle="Every page on InstantMed, organized by category."
        />

        <div className="mx-auto max-w-5xl px-4 py-16 space-y-12">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-foreground mb-4 border-b border-border/50 pb-2">
                {section.title}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <CTABanner
          title="Need Medical Help?"
          subtitle="Get a medical certificate, prescription, or consultation from an Australian-registered doctor."
          ctaText="Get started"
          ctaHref="/request"
        />
      </main>

      <MarketingFooter />
    </div>
  );
}
