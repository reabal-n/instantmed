---
name: instantmed-openseo-research
description: InstantMed OpenSEO governance before provider access, context changes, credit spend or adopting research. Shared seo-research supplies methods within this project boundary.
metadata:
  owner: Rey / instantmed
  scope: project:instantmed
---

# InstantMed OpenSEO Research

OpenSEO is an evidence supplier. It never owns InstantMed strategy, priorities, compliance, or the health-guide queue. Apply this workflow before any upstream OpenSEO skill or MCP call; these rules override upstream instructions to infer, sharpen, or write project strategy.

## Load Order

Read:

1. `AGENTS.md`, then `wiki/index.md`
2. `docs/OPERATIONS.md` under **OpenSEO Research Supplier**, including the current approval gate and field-ownership table
3. `docs/ROADMAP.md`, `docs/BUSINESS_PLAN.md`, and `docs/REVENUE_MODEL.md`
4. `docs/SEO_CONTENT_POLICY.md` and `docs/ADVERTISING_COMPLIANCE.md`
5. `docs/ARTICLE_TEMPLATE.md` for any health-guide or content-queue decision
6. The selected upstream OpenSEO skill

## Approval Gate

- Obey the current status in `docs/OPERATIONS.md`. While it is blocked, stop before OpenSEO authentication, project creation, project-context reads or writes, Search Console connection, or research calls.
- Never send PHI, patient or staff data, support correspondence, credentials, intake data, or private operational records to OpenSEO.
- Once the vendor gate is approved, treat a user's explicit request for a named research run as authority for that run only. Otherwise show the exact credit-spending call and scope and obtain approval before spending.
- Project-context writes, saved-keyword changes, outreach sends, listing changes, publishing, and indexing requests remain separate external mutations. Obtain the approval required by the owning workflow.

## Direction Of Truth

Follow the field ownership table in `docs/OPERATIONS.md`.

- Repo-owned context fields are projections. Refresh them only when the user explicitly asks for a projection refresh, from the current canonical docs, after showing the proposed field diff. Never import OpenSEO edits back into repo policy or strategy.
- Regular research skills may not rewrite `business_overview`, `current_goal`, `positioning`, `writing_preferences`, or compliance/exclusion custom sections, even when an upstream skill instructs them to.
- Competitors and key pages are source-dated candidates until the user confirms the exact rows. They are evidence, not priority or comparative-claim authority.
- The research log may record the query scope, data date, tools used, credits spent, and factual result after an approved run. It must not contain a new strategy or queue.
- Saved keywords remain tagged candidates. Only `docs/ROADMAP.md` and the GSC-first process in `docs/ARTICLE_TEMPLATE.md` can activate content work.

## Approved Upstream Helpers

Use shared `seo-research` and its OpenSEO reference for keyword research, page clustering, competitor analysis, competitive landscape, link prospecting and requested project-context setup. This project skill retains all account, data, credit and adoption gates. The former six standalone helpers are retired; their consolidation does not expand the approved provider scope.

## Research Path

1. Route existing first-party work first: Google indexing stays `pnpm seo:gsc-index-audit`; guide QA stays `pnpm content:audit`.
2. After the vendor gate opens, read project context and the research log before a paid call. Reuse a matching result under 30 days old unless live volatility or the decision requires a refresh.
3. Run the smallest approved upstream helper that answers the question. Keep source dates, markets, estimates, and first-party versus third-party evidence explicit.
4. Classify every result as evidence, candidate action, or prohibited/out of scope. Do not convert demand into an automatic page, claim, queue item, or outreach send.
5. Route candidates to the existing owner: guide candidates to `docs/ARTICLE_TEMPLATE.md` §8, compliance to `docs/SEO_CONTENT_POLICY.md`, priorities to `docs/ROADMAP.md`, and outreach to the existing approval-gated distribution lane.
6. Report the tools used, data age, credits spent, context writes made, and any approval or live verification still outstanding.

## Hard Boundaries

- No prescription-medicine acquisition pages, medicine-specific request paths, city/local-pack strategy, testimonial or review claims, unsupported comparative claims, or new service strategy.
- `/blog` is the active guide index. Do not treat the noindex `/guides` route as a content hub.
- Outreach drafts require `instantmed-marketing-compliance-review`; nothing sends without explicit approval.
- Separate tool estimates from verified first-party or live-page evidence.


## Scope and ownership

This workflow applies only to instantmed and its verified checkouts/worktrees. Confirm the project from its operating docs and Git root before applying it. Project doctrine owns product, brand, privacy and release requirements; shared skills supply techniques only. Resolve commands and project paths from the active checkout, not a fixed machine path.

## Verification

Verify the requested result against the authoritative project files and relevant checks. Report evidence, skipped checks and remaining uncertainty; do not infer owner approval.
