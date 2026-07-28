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

## Advertising Operations

**Google Ads Agent**:
The combined deterministic control plane and Codex manager for Google Ads. It cannot mutate the account without a fresh Operator approval for an exact Approval Packet.
_Avoid_: Ads Manager, autonomous bidder, unrestricted Ads bot

**Operator**:
The human decision authority who approves or rejects each exact Live Ads Mutation before execution.
_Avoid_: Reviewer, observer

**Daily Ads Brief**:
The aggregate, PHI-free Google Ads decision summary delivered to Telegram at 09:00 Australia/Sydney.
_Avoid_: Dashboard dump, daily audit report

**Approval Packet**:
An immutable, expiring proposal that names exact current and requested Google Ads resource values, validation evidence, risk, and rollback state. It may be approved through its authenticated Telegram action or by an exact Codex-task approval.
_Avoid_: Recommendation, general approval, change idea

**Live Ads Mutation**:
Any action that changes the live advertising account, including a pause made in response to an emergency. Every mutation requires current Operator approval for the exact Approval Packet.
_Avoid_: Routine adjustment, automatic optimisation

**Mutation Receipt**:
The append-only evidence that an approved Ads change had its baseline read, validation, apply result, read-back verification, actor, timestamps, and rollback state recorded.
_Avoid_: Success message, mutation log
