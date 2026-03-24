import { Navbar } from "@/components/shared/navbar";
import { MarketingFooter } from "@/components/marketing";
import { MarketingPageShell } from "@/components/shared/marketing-page-shell";
import { CenteredHero } from "@/components/heroes";
import { CTABanner } from "@/components/sections";
import { allArticles } from "@/lib/blog/articles";
import { BreadcrumbSchema } from "@/components/seo/healthcare-schema";
import { ArticlesPage } from "@/components/blog/articles-page";
import type { Metadata } from "next";

// Revalidate every 12 hours — blog index updates occasionally
export const revalidate = 43200;

export const metadata: Metadata = {
  title: "Health Guides | Telehealth Resources",
  description:
    "Doctor-reviewed health guides on med certs, telehealth and prescriptions. Written by AHPRA-registered Australian GPs.",
  openGraph: {
    title: "InstantMed Health Guides",
    description:
      "Doctor-reviewed health guides from Australian medical professionals.",
    url: "https://instantmed.com.au/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InstantMed Health Guides",
    description:
      "Doctor-reviewed health guides from Australian medical professionals.",
  },
  alternates: {
    canonical: "https://instantmed.com.au/blog",
  },
};

export default function BlogPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://instantmed.com.au" },
          { name: "Health Guides", url: "https://instantmed.com.au/blog" },
        ]}
      />

      <MarketingPageShell>
      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />

        <main className="flex-1 pt-20">
          <CenteredHero
            pill="Doctor-Reviewed Content"
            title="Health Guides"
            highlightWords={["Guides"]}
            subtitle="Practical health information reviewed by AHPRA-registered doctors. Clear, accurate guidance for Australians."
          />

          {/* Articles with Search, Filter, Pagination */}
          <section className="px-4 py-8">
            <div className="mx-auto max-w-6xl">
              <ArticlesPage articles={allArticles} />
            </div>
          </section>

          <CTABanner
            title="Need a Medical Certificate?"
            subtitle="Get assessed by an AHPRA-registered doctor. Most requests reviewed within an hour."
            ctaText="Start a request"
            ctaHref="/request"
            secondaryText="From $19.95 · No Medicare card required"
            secondaryHref="/pricing"
          />
        </main>

        <MarketingFooter />
      </div>
      </MarketingPageShell>
    </>
  );
}
