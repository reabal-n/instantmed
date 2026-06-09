import { Check } from "lucide-react"

import { Footer } from "@/components/shared/footer"
import { Navbar } from "@/components/shared/navbar"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"

export const dynamic = "force-static"

export const metadata = {
  title: "Thanks",
  description: "Thanks for letting us know how you found InstantMed.",
  robots: { index: false, follow: false },
}

/**
 * Landing page for the review-request email's one-click "how did you hear about
 * us?" links. The answer is already recorded by /api/attribution/heard before
 * the redirect lands here; this just confirms and offers a soft Google review.
 */
export default function HeardThanksPage() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-20">
        <div className="w-full max-w-md rounded-2xl border border-border/50 bg-white p-8 text-center shadow-md shadow-primary/[0.06] dark:bg-card">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-light">
            <Check className="h-7 w-7 text-success" />
          </div>
          <h1 className="text-xl font-semibold">Thanks, that helps a lot</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Knowing how people find us means we can reach more Australians who need
            fast, doctor-reviewed care.
          </p>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            ⭐ Leave a Google review
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            Already reviewed? Legend, thanks! 🙏
          </p>
        </div>
      </main>
      <Footer variant="minimal" />
    </>
  )
}
