# InstantMed AI Voice Secretary — Build Plan

> **Authority:** Reference only. This file does not change production behaviour or independently enter work into the active queue; `docs/ROADMAP.md` remains the sole active priority queue.
>
> **Status:** Fable-reviewed and implemented locally. Default-OFF production activation and a controlled live call remain unverified.
>
> **Purpose:** Define Lena: a natural-speaking voice secretary that takes a short patient message for the Medical Director.

## Outcome

Calls to **0495 049 555** are answered by Lena in a warm, young-adult Australian voice. Lena listens to what the Patient needs, collects their full name and date of birth, confirms a concise message, and securely sends it to a Medical Director-only inbox. A callback number is requested only when the Patient wants a return call.

Lena does not diagnose, triage, change a certificate or prescription, disclose Patient information, or promise an outcome. The Medical Director handles the request after the call.

## Locked call experience

1. Lena opens with exactly: **“Hi, this is Lena from InstantMed support. How can I help?”**
2. Lena listens to the issue first. Common categories are:
   - medical-certificate request or correction;
   - prescription or script issue;
   - payment or refund;
   - account or technical issue;
   - complaint;
   - other.
3. Lena only accepts a message from the Patient about themselves. She does not accept a message for another Patient.
4. Lena asks for the Patient's full name and date of birth. These details support a best-effort record match; they do not authenticate the caller.
5. Lena asks no more than two short clarifying questions when needed, then reads back a concise summary.
6. The Patient must confirm the summary before it can be saved.
7. Lena asks whether the message is enough or the Patient wants the Medical Director to call them.
8. If a callback is requested, Lena asks for the best callback number and reads it back. Caller ID is not silently stored as the callback number.
9. Lena saves one confirmed message per call.
10. Only after the database write succeeds does Lena say: **“Thanks, I've sent your message securely to our Medical Director.”**
11. If saving fails, Lena says it could not be confirmed and directs the Patient to **instantmed.com.au/contact**. She never claims an unsaved message was sent.

Additional behaviour:

- English-only for v1.
- Aim for a five-minute call; warn shortly before the existing 12-minute hard cap.
- If the call ends after confirmation and a successful save, keep the message. If it ends before confirmation, save nothing.
- If full name or date of birth cannot be captured after reasonable attempts, Lena may still save the confirmed message with an **incomplete details** flag.
- After two failed attempts to understand the Patient, direct them to the contact page.
- If immediate danger is stated, use one fixed instruction to call **000**. Lena does not assess urgency or continue clinical questioning.
- Complaints are flagged in the inbox; the Medical Director manually starts the formal complaints workflow.
- No spoken AI or transcription announcement, menu, or consent keypad.

## What stays from the staged prototype

- Twilio AU1 voice routing and bidirectional Media Streams.
- OpenAI Realtime audio with interruption/barge-in support.
- Exact Twilio signature validation for HTTP and WebSocket requests.
- Short-lived encrypted call-session tokens.
- Bounded request bodies, audio buffers, call duration, and concurrency.
- No raw audio or full transcript retention.
- Encrypted PHI at rest.
- Idempotent writes keyed from the Twilio Call SID.
- PHI-free Telegram alerts and a default-off kill switch.

## What is replaced

- Remove the DTMF consent route and the long AI/transcription disclosure.
- Replace `create_callback_request` with a single `create_medical_director_message` tool.
- Replace caller name with Patient full name and date of birth.
- Do not require a callback number for certificate, script, or other message-only requests.
- Do not fall back to caller ID for callbacks.
- Replace the old callback categories and `pending/contacted/resolved` model with the message categories and queue below.
- Replace the old callback-only admin link and copy everywhere.

## Data and queue

Rewrite the unapplied voice migration before production use. The primary table should be named `medical_director_voice_messages` and contain:

- encrypted Patient full name, date of birth, confirmed summary, and optional callback number;
- category, callback requested, Patient-details-complete, and Patient-match state;
- optional suggested Patient ID from best-effort matching;
- `new`, `in_review`, or `resolved` status;
- created, claimed, resolved, and reopened actor/timestamps;
- resolution reason: `actioned`, `callback_completed`, `unable_to_match`, `duplicate`, `no_action_required`, or `spam_test`;
- delivery-claim metadata for bounded Telegram retries;
- a non-reversible Call SID fingerprint for idempotency, never the raw Call SID in staff UI.

The confirmed message payload is immutable. Staff can change workflow status and the suggested Patient match, but not rewrite what the Patient confirmed.

### Patient matching

- Query a small, bounded candidate set by normalized full name, then decrypt and compare exact date of birth inside a server-only function using the existing profile helpers.
- One result becomes a clearly labelled **suggested match**, not verified identity.
- Zero or multiple results retain the supplied details and show `unmatched` or `ambiguous`.
- Matching never reveals account information to Lena or the caller.
- A voice message is not automatically copied into the clinical record. If clinical action is taken, the Medical Director records that action through the existing clinical workflow.

### Retention

- The voice inbox is a transient administrative queue.
- Resolved message payloads are deleted after 30 days by a bounded scheduled cleanup.
- Before resolving a clinically relevant request, the Medical Director remains responsible for recording the resulting clinical action in the canonical Patient record.
- Keep only PHI-free audit metadata after queue deletion.

## Medical Director inbox

Build an admin-only route at `/admin/ops/voice-messages` with a detail route for each message. Support-role users must not be able to list or open these records.

The inbox needs:

- New, In review, and Resolved tabs with counts;
- newest-first rows showing received time, category, callback requested, and match state;
- a detail view that decrypts the Patient details only after authorised access;
- take ownership, resolve with reason, reopen, and correct suggested-match actions;
- a clear complaint flag;
- an audit entry for every view and workflow mutation, with no PHI in audit metadata.

Telegram sends an immediate PHI-free alert after a durable save and an aggregate unresolved reminder at most hourly. Alerts contain only the category, received time, and secure inbox link.

## Public website

Make **0495 049 555** the only public support number and use `+61495049555` for telephone links.

- Replace the old public number in the navbar, mobile menu, footer, contact page, complaints page, privacy page, structured data, approved contact constants, and generated public text surfaces.
- Label it **24/7 voice message support**.
- Keep the old mobile number private for recovery/runbook use; do not rewrite historical evidence or private break-glass documents.
- The privacy page explains that Lena is an automated voice assistant, live audio is processed to run the conversation, and InstantMed stores the confirmed message fields rather than raw audio or a full transcript.
- Do not add a floating phone widget.

## Implementation sequence

### 1. Canon and schema

- Update `CONTEXT.md` and the voice sections of `docs/CLINICAL.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/OPERATIONS.md`, `docs/ROADMAP.md`, and `wiki/architecture.md` to this model.
- Rewrite the unapplied voice migration and generated DB types for the new table, statuses, indexes, RLS, retention function, and notification claims.
- Update environment documentation and integration checks without changing the existing Twilio/OpenAI provider choice.

### 2. Secure message service

- Replace `lib/twilio/voice-callback-request.ts` with the Medical Director message service.
- Add schemas, encryption/decryption, idempotent creation, match state, queue transitions, retention cleanup, rate limits, and audit calls.
- Change Telegram delivery and retry code to PHI-free voice-message alerts.
- Add server-only Patient matching by full name plus date of birth.

### 3. Lena conversation and transport

- Rewrite `lib/twilio/openai-realtime.ts` and `lib/twilio/openai-realtime-bridge.ts` around the locked conversation and one save tool.
- Make the incoming TwiML route start the stream directly; remove the consent keypad route.
- Keep the fallback and status routes, but direct failed calls to the contact page rather than claiming a message exists.
- Add an early self-only check, confirmation gate, optional callback branch, incomplete-details branch, disconnect handling, two-strike comprehension fallback, and 12-minute warning.
- Use the closest launchable warm, natural Realtime voice. `marin` is the current warm-neutral choice; an Australian accent remains an unverified live-audio quality check rather than a blocker hidden in code.

### 4. Admin inbox

- Add admin-only routes, server actions, route constants, list/detail components, filters, status actions, complaint flagging, and suggested-match correction.
- Follow the existing operator-shell patterns and keep the page compact and scannable.
- Run the repo UI workflow before implementation (`/impeccable teach`, then shape) and the InstantMed browser-verification workflow before sign-off.

### 5. Public number and privacy

- Update the canonical contact constants and every public renderer.
- Add the number to desktop and mobile navigation.
- Update privacy and complaints copy with the narrow voice-message boundary.
- Regenerate derived public text and synchronised agent docs using their existing scripts.

### 6. Operations and release

- Add the retention schedule and unresolved-reminder schedule.
- Add abuse controls: hashed-caller rate limiting, global concurrency cap, and an operator denylist without storing raw caller ID.
- Keep `TWILIO_AI_VOICE_ENABLED=false` through development and preview testing.
- Configure Twilio only after the production deployment passes the checks below, then enable the kill switch and make one controlled live call.
- Rollback is one env change: disable Lena and return a short TwiML fallback directing Patients to the contact page.

## Verification

Automated tests must cover:

- exact opening and no consent/AI/transcription preamble;
- Patient-only messages and no disclosure of Patient data;
- name and date-of-birth collection, incomplete-details handling, and best-effort match outcomes;
- summary confirmation before save and exactly one tool call;
- optional callback branch with no caller-ID fallback;
- all six categories;
- successful save acknowledgement versus failure wording;
- disconnect before/after confirmation;
- emergency fixed response and two-strike comprehension fallback;
- idempotency, encryption, RLS, rate limits, Telegram retry claims, retention deletion, and audit metadata;
- admin-only inbox access and queue transitions;
- public phone consistency and absence of the old number from rendered public surfaces.

Release evidence:

- lint, typecheck, focused unit/integration tests, migration checks, and production build;
- browser proof for desktop/mobile navbar, contact, complaints, privacy, and the full admin inbox flow;
- an adversarial prompt/audio test set for clinical questions, identity probing, promises, third-party messages, prompt injection, interruptions, silence, noisy audio, and save failures;
- voice audition recordings that pass the warmth, Australian-accent, latency, and natural-interruption criteria;
- preview call receipt, followed by one controlled production call and confirmation that no audio/transcript/PHI reached logs, Sentry, PostHog, Telegram, or audit metadata.

## Out of scope

- Clinical advice, triage, diagnosis, prescribing, certificate editing, refunds, or account changes by Lena.
- Patient-specific answers or status lookup during the call.
- Messages submitted for another Patient.
- Order-reference collection.
- Automatic clinical-record notes.
- SMS, outbound campaigns, live transfer, multilingual support, or promised callback times.

## Fable review brief (completed)

Review this as a production plan, not as permission to implement. Return **APPROVE**, **REVISE**, or **BLOCK**, followed only by material issues and the smallest corrections. Focus on:

1. whether the call feels short, natural, and secretary-like;
2. whether any branch can save an unconfirmed or misleading message;
3. whether the Medical Director inbox is sufficient to act on messages;
4. whether PHI can leak through logs, alerts, matching, or provider events;
5. whether the migration, retention, failure, and rollback paths are complete;
6. whether the proposed tests would prove the system works end to end.
