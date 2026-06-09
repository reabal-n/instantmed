-- Self-reported attribution (2026-06-09): "How did you hear about us?" on intakes.
--
-- ~50% of paid orders land in Direct/Unknown because native LLM apps (ChatGPT /
-- Perplexity), in-app browsers, iOS, and word-of-mouth all strip the referrer —
-- the code-side capture pipeline cannot see them. A one-question post-purchase
-- self-report is the only way to attribute that dark traffic. This column stores
-- the answer as a short enum token (e.g. 'ai', 'friend', 'search'), never PHI.
--
-- Written write-once (only when currently NULL) from three surfaces that share
-- one option set + one HMAC-token write path:
--   1. /patient/intakes/success (logged-in)
--   2. /auth/complete-account (guest checkout — the Direct/Unknown cohort)
--   3. the day-2 review-request email (one-click answer links)
--
-- Acquisition metadata only: APP-6 aggregate/de-identified secondary use is
-- already covered by the privacy policy. NOT in the PHI inventory, never shown
-- back to the patient, never on the certificate.

ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS heard_about_us text;

COMMENT ON COLUMN public.intakes.heard_about_us IS
  'Self-reported "how did you hear about us?" answer (enum token: ai|search|friend|forum|ad|other). NULL = unanswered. Acquisition metadata, not PHI. Write-once.';
