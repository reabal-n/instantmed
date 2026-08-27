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

**Attribution Investigation Hold**:
A durable Operator-owned block opened when a service campaign shows material cross-service attribution. Later threshold recovery does not clear it; only an explicit, recorded Operator resolution does.
_Avoid_: Transient purity warning, automatic threshold reset, soft alert

**Attribution Investigation Resolution**:
The durable Operator decision that closes an Attribution Investigation Hold after its cause is recorded, any correction is complete, and fresh evidence meets the clearance threshold. An unknown cause or threshold recovery alone is not a resolution.
_Avoid_: Automatic clear, acknowledgement, stale-data waiver

**AI Attribution Expansion Gate**:
The evidence threshold that reopens dedicated AI-channel attribution work: at least 10 reportable AI-attributed paid orders in a closed 30-day window, or a concrete acquisition decision that cannot be made without separating named assistant traffic from Direct.
_Avoid_: Citation-volume trigger, speculative instrumentation, zero-detection mandate

## Acquisition & Content

**Order-proven Page**:
A public page with at least 3 free-channel-attributed paid orders in a closed 30-day window, measured from payment truth. Order evidence qualifies a page for bounded deepening (at 10 or more) or maintenance (3 to 9) work the same way GSC-proven query evidence does; it never authorises new page production.
_Avoid_: Traffic-proven page, ranking winner, citation winner

**Free-channel Order**:
A paid order whose attribution carries no paid-click identifier (no gclid, gbraid, wbraid, campaign id, or cpc medium). Recovery and lifecycle email orders sit inside this bucket unless a comparison explicitly separates them with the canonical classifier.
_Avoid_: Organic order (narrower), unattributed order

## Voice Operations

**AI Voice Secretary**:
The consent-first automated assistant that speaks with a Caller, collects a caller-confirmed message, and relays it to the Medical Director. It does not handle the issue itself and is not a clinical consultation, triage service, or patient-authentication channel.
_Avoid_: AI doctor, voice doctor, phone consultation, autonomous support agent

**Medical Director Message**:
The minimal message a Caller confirms for Medical Director review. It may include an optional callback number but does not imply that a callback, correction, clinical decision, or completed outcome has been promised.
_Avoid_: Callback request, clinical intake, correction order, resolution, call transcript

**Caller**:
The unauthenticated person speaking with the AI Voice Secretary. A Caller may be the Patient or a third party and may provide relevant Patient information, but the secretary never treats that information as identity verification or discloses Patient information in return.
_Avoid_: Verified Patient, authenticated Patient

**Patient Match Details**:
The Patient's full name and date of birth, supplied by a Caller so the Medical Director can locate the likely Patient record. These details support record matching but do not authenticate the Caller.
_Avoid_: Verified identity, order reference, account authentication
