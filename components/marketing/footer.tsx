/**
 * Re-export Footer as MarketingFooter for backward compatibility.
 * The unified Footer component lives in @/components/shared/footer.
 * MarketingFooter is equivalent to <Footer variant="marketing" /> (the default).
 */
import { Footer } from "@/components/shared"

export async function MarketingFooter() {
  return <Footer variant="marketing" />
}
