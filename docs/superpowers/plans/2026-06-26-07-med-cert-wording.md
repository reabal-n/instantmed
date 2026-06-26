# Medical Certificate Wording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make medical certificate body wording slightly warmer while keeping the certification and medicolegal scope unchanged.

**Architecture:** Keep `getBodyText` and `getReturnText` clinically isolated. Add a separate `getSupportText` paragraph rendered after the absence scope line. Tests lock the new sentence and continue to block diagnosis, clearance, capacity, return-to-work, legal validity, acceptance, and high-stakes language.

**Tech Stack:** TypeScript 5.9, pdf-lib renderer, Vitest, optional `pdftotext` PDF text verification.

## Global Constraints

- Keep certification sentence unchanged.
- Keep absence scope sentence unchanged.
- Add support sentence: `Please get in touch with us if you have any questions about this certificate.`
- Apply support sentence to work, study, and carer certificates.
- Keep footer unchanged, including `For questions, contact support@instantmed.com.au.`
- Do not put the support email in the body.
- Do not use “concerns” or “do not hesitate”.
- Do not add diagnosis, capacity, clearance, return-to-work, legal validity, acceptance, modality disclosure, or high-stakes use-case wording.

---

## File Structure

- Modify `lib/pdf/template-renderer.ts`: add `getSupportText` and render third paragraph.
- Modify `lib/__tests__/med-cert-medicolegal-scope.test.ts`: lock support text and forbidden wording.
- Modify `docs/CLINICAL.md`: update med-cert language row to mention the support sentence.

## Task 1: Add Support Text Function And Unit Tests

**Files:**
- Modify `lib/pdf/template-renderer.ts`
- Modify `lib/__tests__/med-cert-medicolegal-scope.test.ts`

**Interfaces:**
- Produces:

```ts
export function getSupportText(): string
```

- [ ] **Step 1: Write failing tests**

Update imports:

```ts
import { getBodyText, getReturnText, getSupportText, renderTemplatePdf } from "@/lib/pdf/template-renderer"
```

Add assertions:

```ts
const supportText = getSupportText()
expect(supportText).toBe("Please get in touch with us if you have any questions about this certificate.")
expect(supportText).not.toMatch(/\bsupport@/i)
expect(supportText).not.toMatch(/\bconcerns\b/i)
expect(supportText).not.toMatch(/\bdo not hesitate\b/i)
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm test -- lib/__tests__/med-cert-medicolegal-scope.test.ts`

Expected: FAIL because `getSupportText` does not exist.

- [ ] **Step 3: Implement `getSupportText`**

In `lib/pdf/template-renderer.ts`:

```ts
export function getSupportText(): string {
  return "Please get in touch with us if you have any questions about this certificate."
}
```

- [ ] **Step 4: Run unit test**

Run: `pnpm test -- lib/__tests__/med-cert-medicolegal-scope.test.ts`

Expected: PASS for unit assertions; PDF assertion may still fail until renderer draws text.

- [ ] **Step 5: Commit**

```bash
git add lib/pdf/template-renderer.ts lib/__tests__/med-cert-medicolegal-scope.test.ts
git commit -m "feat: add medical certificate support text"
```

## Task 2: Render Support Paragraph In PDF Body

**Files:**
- Modify `lib/pdf/template-renderer.ts`
- Modify `lib/__tests__/med-cert-medicolegal-scope.test.ts`

**Interfaces:**
- Body paragraph order:
  1. salutation
  2. certification body
  3. absence scope
  4. support sentence

- [ ] **Step 1: Add PDF text assertion**

In the existing `pdftotext` test, add:

```ts
expect(normalizedText).toContain("Please get in touch with us if you have any questions about this certificate")
```

- [ ] **Step 2: Render support paragraph**

After drawing `returnText`, add paragraph gap and draw `getSupportText()`.

Ensure both `returnText` and support paragraph check `LAYOUT.maxBodyY`.

- [ ] **Step 3: Run PDF test**

Run: `pnpm test -- lib/__tests__/med-cert-medicolegal-scope.test.ts`

Expected: PASS. If local environment lacks `pdftotext`, the PDF text test is skipped but unit text assertions still pass.

- [ ] **Step 4: Commit**

```bash
git add lib/pdf/template-renderer.ts lib/__tests__/med-cert-medicolegal-scope.test.ts
git commit -m "feat: render support sentence on certificates"
```

## Task 3: Update Clinical Documentation

**Files:**
- Modify `docs/CLINICAL.md`

**Interfaces:**
- Documents locked wording boundaries.

- [ ] **Step 1: Update med-cert language row**

Change the med-cert language row to state that the body includes the unchanged certification sentence, unchanged absence scope sentence, and the support sentence.

- [ ] **Step 2: Preserve prohibitions**

Keep the existing explicit prohibitions: no medically unfit, no fitness-for-X, no exam-deferral support, no workplace-restriction/capacity-assessment disclaimer, no diagnosis, and no modality disclosure.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- lib/__tests__/med-cert-medicolegal-scope.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/CLINICAL.md lib/__tests__/med-cert-medicolegal-scope.test.ts
git commit -m "docs: document medical certificate support wording"
```

## Verification

- Run `pnpm test -- lib/__tests__/med-cert-medicolegal-scope.test.ts`.
- Run `pnpm typecheck`.
- Render or preview a work, study, and carer certificate if there is an existing preview route or local renderer flow.
- Confirm footer still includes `For questions, contact support@instantmed.com.au.`
- Confirm body does not include the support email.
