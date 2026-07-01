# Google Ads Optimizes Net Retained Purchase Value

Status: accepted

InstantMed uses the server-side offline purchase import as the Primary Google Ads bidding signal, not browser purchase tags or funnel micro-conversions, because Stripe/Supabase payment truth is the least ambiguous conversion source. The chosen optimization target is **Net Retained Purchase Value**: successful purchases upload once by intake/order id, full refunds and disputes upload a `RETRACTION`, and partial refunds upload a `RESTATEMENT` with the retained AUD value. Every adjustment path records a PHI-safe `google_ads_conversion_adjustment` audit row.

Considered alternatives: optimize against gross purchase value and handle refunds only in internal reporting, or assign dollar values to page view / intake complete / checkout start milestones. Those alternatives make Google Ads chase low-quality or reversed revenue, so micro-conversions stay Secondary/non-bidding and PostHog remains the product-funnel source of truth.
