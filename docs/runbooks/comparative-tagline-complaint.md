# Runbook: Comparative tagline complaint

> Trigger: an AHPRA complaint, TGA notice, Medical Board contact, Google Ads disapproval, competitor cease-and-desist, or media inquiry citing the tagline `"Faster than your GP."` (or any comparative health-service claim derived from it).
>
> **Owner:** Rey (founder). **Backup:** Medical Director.
> **First-touch SLA:** 15 minutes to switch paid creative. 4 hours to acknowledge. 14 days to formal response (matches AHPRA clinical-complaint SLA in `CLAUDE.md`).
> **Last reviewed:** 2026-05-10.

This runbook exists because the brand spine `"Faster than your GP."` is a comparative health-service claim. It is defensible (compares process speed, not clinical outcome, and is substantiable) but is a known hot-button surface for AHPRA, TGA, Medical Board, and Google Ads healthcare review. The defense pack and the swap mechanism already exist in code. This document tells you how to use them, in what order, with no thinking required during the actual incident.

---

## 1. Triage in the first 15 minutes

When the trigger arrives (email, phone, Google Ads disapproval, social mention, competitor letter):

1. **Capture the artefact.** Screenshot the surface or notice. Save the original email/letter as PDF. Note the date, sender, reference number, and the exact wording cited.
2. **Classify the source.** Use the table below. The classification drives the response speed.

| Source | Treat as | First action |
|---|---|---|
| AHPRA notification | Formal complaint | Acknowledge via runbook §3 within 4 hours. Do not respond on substance until §4. |
| TGA notice | Regulator | Acknowledge within 4 hours. Engage compliance counsel. |
| Medical Board letter | Regulator | Acknowledge within 4 hours. Engage compliance counsel. |
| Google Ads disapproval | Platform | Switch to paid-safe variant (§2). No external response required. |
| Competitor cease-and-desist | Legal threat | Do not respond. Forward to counsel. Do switch paid variant (§2) as a precaution. |
| Patient complaint about ad copy | Customer | Respond via support@ within 24h with the substantiation summary (§5). |
| Media / journalist inquiry | Reputational | Do not respond same-day. Escalate to founder, prep statement via §6. |

3. **Open an incident ticket.** Create a Linear ticket titled `Tagline complaint <YYYY-MM-DD> <source>`. Attach the artefact. Tag `compliance`, `priority:p1`.

---

## 2. Switch to the paid-safe tagline (15-minute action)

The codepath for the swap is built into [`lib/marketing/approved-claims.ts`](../../lib/marketing/approved-claims.ts). `TAGLINE` ("Faster than your GP.") and `TAGLINE_PAID_SAFE` ("Faster than the wait at your GP.") are both registered claims. The lower-risk variant compares waiting time, not clinician quality, and is what we ship to paid creative when review sensitivity is high.

### When to switch

- **Always switch immediately** for: Google Ads disapproval, AHPRA notification, TGA notice, Medical Board letter, competitor cease-and-desist.
- **Hold the brand spine** for: organic SEO, owned email, brand film outro, OG image. The brand surfaces stay on `TAGLINE` unless a regulator asks for the comparison to be removed entirely.
- **Edge case:** if the regulator asks for the comparison to be removed entirely, replace `TAGLINE` with `PROP_PHRASE` ("Telehealth without the small talk.") on every surface and notify the founder before deploying.

### How to switch (paid creative only, fastest path)

Paid Google Ads copy lives outside the codebase, in the Google Ads account. You do not need to deploy code to switch ads.

1. Open Google Ads account `920-501-0513` (account ID is in [`docs/ADVERTISING_COMPLIANCE.md`](../ADVERTISING_COMPLIANCE.md) §1).
2. Filter all enabled responsive search ads (RSAs) where any headline, description, or asset contains `Faster than your GP`.
3. For each match: pause the ad, duplicate it, replace the matched text with `Faster than the wait at your GP`, save, enable the duplicate. Do not edit the original because Google Ads recreates ad-strength history on edits and you lose performance data.
4. Repeat for sitelinks, callouts, structured snippets, and image asset overlays.
5. Confirm the change by running an account-level search for `faster than your gp` and verifying zero enabled assets.

**Time budget:** 10 minutes for typical account size. If it takes longer than 20 minutes, escalate to founder.

### How to switch (full surface, code change)

Use this when a regulator asks for the brand spine itself to be removed, not just the paid variant.

1. Edit [`lib/marketing/approved-claims.ts`](../../lib/marketing/approved-claims.ts).
2. In the `tagline` entry, replace the `text` value `"Faster than your GP."` with the temporary safe text. Add a `notes` line citing the runbook ticket: `// Temporary: see docs/runbooks/comparative-tagline-complaint.md ticket <id>`.
3. Run `pnpm test run lib/__tests__/voice-guard.test.ts lib/__tests__/approved-claims-contract.test.ts` to confirm the registry contract still holds.
4. Run `pnpm build` and verify no surface still hardcodes the literal string (`grep -r "Faster than your GP" --include="*.tsx" --include="*.ts" lib components app`). The brand-surfaces smoke spec at `e2e/brand-surfaces.smoke.spec.ts` will catch any drift.
5. Commit with the ticket ID in the message. Push. Verify Vercel deploys cleanly within 10 minutes.
6. Spot-check the homepage, OG image, and the email footer in production. Open one paid landing page in incognito to confirm the swap rendered.

**Reversal:** revert the commit when the runbook ticket closes. Do not let the temporary copy become the permanent brand line.

---

## 3. Acknowledge within 4 hours (regulator path)

Send an acknowledgment to the regulator from `complaints@instantmed.com.au` within 4 hours of receipt. Do not address substance yet. Use this template, edited only for the named regulator and reference number.

```
Subject: Acknowledgment of <regulator reference>

Dear <Regulator>,

I confirm receipt of your correspondence dated <date>, reference <number>,
regarding advertising material on instantmed.com.au.

We take regulatory compliance seriously and are reviewing the matter.
We will respond substantively within 14 days, in line with the AHPRA
complaint-handling SLA. If you require an earlier response or additional
information sooner, please advise.

Kind regards,
Rey <surname>
Founder, InstantMed Pty Ltd
ABN 64 694 559 334
Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010
complaints@instantmed.com.au · 0450 722 549
```

Save the sent acknowledgment to the Linear ticket.

---

## 4. Substantive response within 14 days (regulator path)

The substantive response argues that the comparative claim is defensible because it compares **process speed** (booking + appointment-time wait), not clinical outcome, and is substantiable from public Australian healthcare data.

### 4.1 Substantiation pack

Cite the following sources in the response. Keep the latest figures fresh; refresh the GP wait baseline every 6 months from the most recent ABS Patient Experience Survey.

| Claim | Source | Figure (as of 2026-05-10) | Where to refresh |
|---|---|---|---|
| Median GP wait for non-urgent appointment | ABS Patient Experience Survey 4839.0 | Median 1-3 days; 35% of Australians waited longer than they felt acceptable | abs.gov.au, search "Patient Experience" |
| GP appointment in-clinic wait time | RACGP Health of the Nation report | Median in-clinic wait 12-18 minutes after appointment time | racgp.org.au/health-of-the-nation |
| Telehealth median delivery time, InstantMed | PostHog `request_submitted` to `request_approved` event delta | Median 18 minutes (rolling 30-day) | PostHog InstantMed project, weekly pulse |
| Med-cert median delivery, InstantMed | Same source, filtered to `service=med-cert` | Median 14 minutes | PostHog, weekly pulse |

The substantiation page lives at [`/why-instant`](../../app/why-instant). Confirm the page is live and the figures match the response before sending.

### 4.2 Defensibility argument (template)

```
Subject: Substantive response to <regulator reference>

Dear <Regulator>,

Further to our acknowledgment of <date>, please find our substantive
response to the matters you raised regarding the advertising line
"Faster than your GP." on instantmed.com.au.

1. Nature of the comparison

The advertising line compares the process speed of obtaining a clinical
outcome through InstantMed against the typical process speed of
obtaining the equivalent outcome through a face-to-face GP appointment.
It does not compare clinician quality, training, scope, or clinical
judgment, and it does not promise a clinical outcome. The comparison is
limited to the wait-and-delivery process: time to acknowledge a request,
time to clinical review, and time to documentation delivery.

2. Substantiation

a. Median GP wait for non-urgent appointment in Australia is 1 to 3 days
   (ABS Patient Experience Survey 4839.0, latest release).

b. Median in-clinic wait after appointment time is 12 to 18 minutes
   (RACGP Health of the Nation report, latest release).

c. Median time from patient request submission to clinical review on
   InstantMed is 18 minutes (rolling 30-day, all services), and 14
   minutes for medical certificates specifically (PostHog event data,
   metric definition <link>).

d. The substantiation page at https://instantmed.com.au/why-instant
   discloses the metric definition and the data sources.

3. Compliance posture

a. The line is consistent with AHPRA Section 133 advertising guidance.
   It does not create unreasonable expectations of beneficial treatment,
   does not use testimonials, does not compare clinician quality, and
   does not encourage indiscriminate use of a regulated health service.

b. The line is consistent with TGA health-service advertising guidance.
   It does not directly or indirectly promote any therapeutic good,
   prescription medicine, or restricted product. It is a service-speed
   comparison only.

c. We hold a paid-media variant ("Faster than the wait at your GP.")
   that we use on Google Ads creative where the comparison is more
   narrowly scoped to wait time. This is the version present on all
   currently-enabled paid advertising assets.

4. Action taken

<Describe any voluntary action taken: switched paid variant, refined
substantiation page, etc. Be specific. Do not over-promise.>

We are committed to compliance with all applicable advertising and
clinical-practice obligations. If further information would assist your
review, we are pleased to provide it.

Kind regards,
Rey <surname>
Founder, InstantMed Pty Ltd
```

Include the substantiation page export as a PDF attachment. Include the Google Ads asset list showing only the paid-safe variant is active.

### 4.3 Counsel review

Before sending the substantive response, have it reviewed by:

- Healthcare-advertising counsel (engagement is in `docs/OPERATIONS.md` Vendor list when added; until then, founder engages directly).
- Medical Director, who must agree the clinical-quality boundary is correctly drawn.

Both reviewers should sign off in the Linear ticket before the email goes out.

---

## 5. Patient complaint path (lower severity)

If a patient or member of the public emails `support@instantmed.com.au` complaining about the tagline (rather than a regulator), the support response is:

```
Hi <first name>,

Thanks for the note. The line "Faster than your GP." is a comparison of
how long it takes to get a clinical outcome (request to delivery), not
a comparison of clinician quality. Our doctors are AHPRA-registered
Australian GPs reviewing every request.

The detail is on https://instantmed.com.au/why-instant if you want to
see the source data. If you'd like more information, just reply.

Cheers,
<support agent>
```

Log to the Linear ticket as a related-mention. Do not switch paid creative for an individual patient complaint unless founder approves.

---

## 6. Media / journalist inquiry

Do not respond same-day, regardless of deadline pressure. Acknowledge receipt with this template:

```
Hi <name>,

Thanks for getting in touch. I'd like to give your question the
attention it deserves rather than send a rushed answer. I'll reply
properly within 24 hours.

If you have a hard deadline before then, please let me know.

Rey
```

Then prepare the response with the substantiation pack from §4.1 and the founder. Do not deviate from the language in §4.2 unless founder + Medical Director both approve.

---

## 7. Post-incident

Within 7 days of the ticket closing:

1. Update [`docs/ADVERTISING_COMPLIANCE.md`](../ADVERTISING_COMPLIANCE.md) §10 (Compliance notes) with one line: source, outcome, any operational change required.
2. If the response cited a metric that is now stale or hard to refresh, file a follow-up to instrument the metric properly.
3. If the regulator asked for any wording change, add it to the `BANNED_PHRASES` list in [`lib/marketing/voice.ts`](../../lib/marketing/voice.ts) so the voice-guard test catches future drift.
4. Update this runbook if any step here was wrong, missing, or slow.

---

## 8. Escalation contacts

| Who | When | Contact |
|---|---|---|
| Founder (Rey) | Any complaint | Phone first, then email me@reabal.ai |
| Medical Director | Any clinical-quality assertion in the response, any AHPRA matter | Per `doctors` table; do not put name here per CLAUDE.md identity rule |
| Healthcare-advertising counsel | TGA notice, AHPRA notification, competitor cease-and-desist | TBD; founder engages |
| Google Ads support | Disapproval that does not lift after the swap | Account 920-501-0513, ticket pattern in `docs/ADVERTISING_COMPLIANCE.md` §1 |
| Insurance broker | Any matter that may trigger PI/cyber notification | TBD |
| OAIC | Privacy complaint only (separate runbook) | oaic.gov.au |
| AHPRA | Direct contact only after acknowledgment + counsel review | ahpra.gov.au |

---

## 9. What this runbook is not

- It is not legal advice. The defensibility argument in §4.2 is a starting position, not a final response.
- It does not cover Privacy Act / OAIC complaints. Those follow a different SLA and a different remediation path.
- It does not cover patient clinical complaints (different SLA, different path; see Complaints policy in [`docs/CLINICAL.md`](../CLINICAL.md) and the canonical complaints page at `/complaints`).
- It does not cover content-policy issues with non-tagline copy. For those, edit `BANNED_PHRASES` in [`lib/marketing/voice.ts`](../../lib/marketing/voice.ts) and ship a normal copy fix.

---

**Cross-references:**

- [`docs/BRAND.md`](../BRAND.md) §10, brand-side compliance notes for `TAGLINE`
- [`docs/VOICE.md`](../VOICE.md), full voice canon
- [`docs/ADVERTISING_COMPLIANCE.md`](../ADVERTISING_COMPLIANCE.md), paid acquisition rules
- [`docs/CLINICAL.md`](../CLINICAL.md), clinical decision boundaries and complaint path
- [`lib/marketing/approved-claims.ts`](../../lib/marketing/approved-claims.ts), the swap point
- [`lib/__tests__/approved-claims-contract.test.ts`](../../lib/__tests__/approved-claims-contract.test.ts), registry contract test
- [`lib/__tests__/voice-guard.test.ts`](../../lib/__tests__/voice-guard.test.ts), banned-phrase + em-dash CI guard
- [`e2e/brand-surfaces.smoke.spec.ts`](../../e2e/brand-surfaces.smoke.spec.ts), verifies brand strings render on every brand surface
