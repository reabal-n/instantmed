# InstantMed Context

Project-specific language for InstantMed product, clinical, payment, analytics, and operations work. Use these terms consistently in code, docs, PRs, and incident notes.

## Clinical Identity

**Prescribing Identity**:
The identity bundle required for prescribing pathways: date of birth, sex, phone, structured Australian address, and either a valid Medicare number plus IRN or a valid IHI.
_Avoid_: Medicare required, Medicare-only identity, Medicare and IHI required

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
The voice message assistant that speaks with a Patient, collects a Patient-confirmed message, and relays it to the Medical Director. It does not handle the issue itself and is not a clinical consultation, triage service, or patient-authentication channel.
_Avoid_: AI doctor, voice doctor, phone consultation, autonomous support agent

**Automated Introduction**:
Lena's complete opening: "Hi, this is Lena from InstantMed support. How can I help?" It does not add an AI or transcription announcement, a menu, or an extended disclosure.
_Avoid_: Jessica, consent menu, transcription announcement, extended opening script

**Lena Voice Persona**:
The AI Voice Secretary's warm, young-adult Australian speaking persona. Lena uses short, natural turns, allows the Caller to interrupt, and stays calm and conversational without claiming to be a human staff member.
_Avoid_: Jessica, robotic IVR voice, exaggerated cheerfulness, clinical persona, human impersonation

**Medical Director Message**:
The minimal message a Patient confirms for Medical Director review. It may include an optional callback number when the Patient asks for a return call, but does not imply that a callback, correction, clinical decision, or completed outcome has been promised.
_Avoid_: Callback request, clinical intake, correction order, resolution, call transcript

**Caller**:
The unauthenticated Patient speaking with the AI Voice Secretary about their own request. Lena does not accept a message for another Patient, treat supplied details as identity verification, or disclose Patient information in return.
_Avoid_: Verified Patient, authenticated Patient

**Patient Match Details**:
The Patient's full name and date of birth, supplied so InstantMed can attempt a best-effort record match. The confirmed details are retained with the Medical Director Message even when no unique match is found, and never authenticate the Caller.
_Avoid_: Verified identity, order reference, account authentication

**Callback Preference**:
The Patient's explicit choice between leaving a Medical Director Message only or requesting a return call. A callback number is collected only for a requested return call, and the preference does not promise that or when a call will occur. Caller ID is not silently retained as the callback number.
_Avoid_: Automatic callback, guaranteed callback, callback deadline

**Public Voice Number**:
The sole customer-facing phone number, routed to the AI Voice Secretary. The legacy support and recovery mobile remains private and must not appear on public-rendered surfaces.
_Avoid_: Public recovery number, multiple customer-facing phone numbers, legacy support number
