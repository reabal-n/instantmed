---
runId: 2026-05-25-doctor-dashboard-kcth
journey: Doctor dashboard (queue + header chrome after 2026-05-25 cuts)
url: http://localhost:3000
overallScore: 5
capturedAt: 2026-05-25T09:05:57.240Z
---

# The hero lands. The login wall undoes it.

"Faster than your GP" reads well and the brand spine holds. Then the Get started button asks for an account before a single clinical question. That is where the run loses the patient.

## What's working

- The hero promise is crisp. "Telehealth without the small talk" earns its space.
- Plus Jakarta Sans sits well at display sizes.
- The ivory background on the landing surface feels like us.
- The "Last reviewed 14 min ago" device is the right idea, even if it is underused.

## What to fix, ranked

### 1. Drop the login wall in front of the form

**Impact:** high · **Where:** Get started CTA, around the 0:11 mark

A patient with a sore throat at 9pm does not want to make an account. They want to answer questions. Let them complete the 3-minute form first, then ask for an email at submit. Every screen between the CTA and the first clinical question is a screen where they close the tab.

### 2. Fix the mobile overlap on the hero

**Impact:** medium · **Where:** hero pills, around 0:02

The animated "Medical certificate Approved" and "eScript sent" pills are landing on top of the doctor-review trust badges. On a phone this reads as broken, not premium. Add a safe-area offset to the overlay container so the pills sit cleanly below the static row.

### 3. Put the price and the refund next to the button

**Impact:** high · **Where:** primary CTA microcopy

Right now the hero asks for a click without telling anyone what it costs or what happens if the doctor cannot help. One line under Get started: "Takes about 3 minutes. Full refund if our doctor can't help." Numbers and a guarantee are trust signals. Use them.

## Full critique by category

**Typography (7).** Display type is fine. The AHPRA line under the subtitle is set too tight on mobile. Push line-height to 1.5 and let it breathe.

**Colour and surface (6).** The login screen drops the ivory and lands on a generic cool grey. The Sign In button reads washed out next to the home CTA. Same primary blue, both surfaces.

**Motion (5).** Nearly two seconds of blank white between the landing page and the login screen at 0:08. A skeleton or an ivory tint while the next view loads would mask it.

**Copy voice (6).** Reassuring, but missing the proof. No price. No refund. Two lines of microcopy fix this.

**Hierarchy and layout (5).** Covered above. The overlap on mobile is the headline issue.

**Conversion friction (3).** The login wall. This is the run.

**Signature devices (6).** The wait counter is static. Make it live and specific: "Average cert sent in 14 minutes today." Put it under the CTA, not floating above it.

## Reference frame

Mosh would never ask for a login before the form. They would have the patient three questions deep before the email field appears, and the price would be sitting under the button in 13px grey. Pilot would have shipped the refund guarantee as a one-liner next to the CTA on day one. Stripe would have caught the mobile overlap in a design review. The bones here are good. The sequencing is what needs work.

## Frames

- [8s](frames/008s.png)
- [16s](frames/016s.png)
