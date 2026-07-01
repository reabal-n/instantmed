# InstantMed Context

Project-specific language for InstantMed product, clinical, payment, analytics, and operations work. Use these terms consistently in code, docs, PRs, and incident notes.

## Advertising Attribution

**Net Retained Purchase Value**:
The canonical Google Ads bidding value for a paid order after refunds and disputes are applied. Full refunds and disputes reduce the value to zero via `google_ads_conversion_adjustment`; partial refunds keep only the retained AUD amount.
_Avoid_: Gross purchase value, fake conversion value, micro-conversion value

**Server Purchase Import**:
The server-side offline Google Ads purchase conversion uploaded from Stripe/Supabase payment truth and deduped by the intake/order id. This is the Primary bidding signal for paid Google traffic.
_Avoid_: Browser purchase tag, website purchase action, GA4 purchase goal

**Micro-conversion**:
A funnel milestone such as page view, intake complete, or checkout start that helps product analytics but must not be a Google Ads bidding goal. Keep these in PostHog/internal analytics or as Secondary non-bidding Google Ads diagnostics only.
_Avoid_: Purchase conversion, revenue goal, bidding action

**Browser Purchase Diagnostic**:
A browser-fired purchase event used only to diagnose client-side tracking gaps and compare against server truth. It must be Secondary/non-bidding and deduped by `transaction_id`.
_Avoid_: Primary purchase import, canonical purchase signal
