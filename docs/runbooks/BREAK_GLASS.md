# BREAK_GLASS.md — InstantMed Continuity & Recovery Runbook

> **Purpose.** InstantMed is a solo-operator platform. If the primary operator is
> unavailable — incapacitated, locked out, or unreachable — this document is how a
> trusted successor (co-founder, nominated technical contact, or solicitor-directed
> agent) regains control of the platform and, critically, **recovers patient data
> that is useless without the encryption keys.**
>
> Keep this file in the repo (it contains **no secrets**). Keep the *values* it
> points to in the sealed locations named in §3.

---

## 0. Golden rules

1. **This file never contains a secret value.** Not a key, not a password, not a
   recovery code. It contains an **inventory** and **pointers to where the sealed
   values live**. If you are about to paste a secret here, stop.
2. **The PHI encryption keys are the crown jewels.** Supabase backups are
   AES-256-GCM ciphertext. Without `PHI_MASTER_KEY` + `ENCRYPTION_KEY`, a perfect
   database backup is **permanently unreadable**. Losing these keys is worse than
   losing the database. See §4.
3. **Do not rotate `PHI_MASTER_KEY` / `ENCRYPTION_KEY`** without a re-encryption
   migration (`scripts/encrypt-phi-backfill.ts`). Rotation without migration
   bricks all existing PHI. See OPERATIONS.md → API Key Rotation.
4. **Fill in every `🔒 LOCATION: ____` below.** An inventory with blank locations
   does not survive a real emergency.

---

## 1. Platform identity (for account recovery / proving authority)

| Field | Value |
|-------|-------|
| Legal entity | InstantMed Pty Ltd |
| ABN | 64 694 559 334 |
| Registered address | Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010 |
| Founded | 2026 |
| Primary domain | `instantmed.com.au` |
| Support | support@instantmed.com.au · 0450 722 549 |
| LegitScript cert | 48400566 (telehealth/pharmacy certification — referenced by Google Ads) |
| Primary operator | 🔒 NAME / contact: ____ |
| Nominated successor(s) | 🔒 NAME(s) / contact: ____ |

> Account providers will ask for proof of authority over the entity (ABN, company
> documents, the account's billing email). Keep company-registration documents in
> the same sealed location as §3.

---

## 2. Account inventory (what runs InstantMed)

Each row is an external account the platform depends on. **Recovery method** = how a
successor proves ownership and regains access if the operator's login is gone.
Criticality: 🔴 catastrophic if lost · 🟠 major outage · 🟡 degraded.

| Service | Controls | Login email | 2FA method | Recovery method | Crit |
|---------|----------|-------------|-----------|-----------------|------|
| **Domain registrar** (🔒 which: ____) | DNS for `instantmed.com.au`, MX (email), SPF/DKIM/DMARC | 🔒 ____ | 🔒 ____ | Registrar account recovery + entity proof | 🔴 |
| **Vercel** | Hosting, **all production env vars (the secret store)**, deploys, cron | 🔒 ____ | 🔒 ____ | Vercel support + GitHub/Git owner | 🔴 |
| **Supabase** | Postgres (all patient data), Auth, Storage (cert PDFs) | 🔒 ____ | 🔒 ____ | Supabase support + entity proof. **See §4 — DB alone is not enough.** | 🔴 |
| **GitHub** (`reabal-n/instantmed`) | Source of truth, CI, branch protection | 🔒 ____ | 🔒 ____ | GitHub account recovery; org/repo transfer | 🔴 |
| **Stripe** | Payments, refunds, payout bank account | 🔒 ____ | 🔒 ____ | Stripe support + entity/bank proof | 🔴 |
| **Parchment** | eScript prescribing (doctor SSO) | 🔒 ____ | 🔒 ____ | Parchment account manager | 🟠 |
| **Resend** | Transactional + consented marketing email | 🔒 ____ | 🔒 ____ | Resend support; DNS proves domain | 🟠 |
| **Upstash (Redis)** | Rate limiting (fails open if down) | 🔒 ____ | 🔒 ____ | Upstash support | 🟡 |
| **Sentry** | Error monitoring | 🔒 ____ | 🔒 ____ | Sentry support | 🟡 |
| **PostHog** | Product analytics, funnels | 🔒 ____ | 🔒 ____ | PostHog support | 🟡 |
| **Anthropic** (Claude) | AI (auto-approval drafts, etc.) | 🔒 ____ | 🔒 ____ | Console account recovery; rotate key | 🟡 |
| **OpenAI** | AI (secondary) | 🔒 ____ | 🔒 ____ | Console account recovery; rotate key | 🟡 |
| **Telegram** (bot + operator chat) | The live ops pager | 🔒 bot owner / chat: ____ | — | BotFather via owner account | 🟠 |
| **Google** (Ads `AW-17795889471`, GA4 `G-X0QJQRLL2Y`, Search Console) | Acquisition + indexing | 🔒 ____ | 🔒 ____ | Google account recovery; GSC re-verify via DNS | 🟡 |
| **Telco** (0450 722 549) | Support line; SMS 2FA fallback for many accounts | 🔒 carrier/account: ____ | — | Carrier port/recovery — **a lost SIM can cascade into every SMS-2FA account** | 🟠 |

> **Single points of failure to note:** Vercel holds every runtime secret; Supabase
> holds all PHI; the domain registrar controls email deliverability and many account
> recoveries; the operator's phone number is the SMS-2FA fallback for several
> accounts. Prefer app-based (TOTP) or hardware 2FA over SMS where possible, and
> store the **TOTP recovery codes** in §3.

---

## 3. Sealed-secret location register (POINTERS ONLY — never values)

> The actual values live in the sealed locations below. This table records **where**,
> not **what**. Use at least two independent locations (e.g. a hardware password
> manager **and** a physical sealed copy with the solicitor) so no single loss is
> fatal.

| What | Why it matters | 🔒 Sealed location(s) |
|------|----------------|----------------------|
| `PHI_MASTER_KEY` | Master key for PHI envelope encryption. **Without it, all PHI backups are unreadable.** | 🔒 ____ (e.g. printed + sealed with solicitor; AND offline password manager) |
| `ENCRYPTION_KEY` | Second field-level PHI key (≥32 bytes). Same stakes. | 🔒 ____ |
| Vercel login + recovery | Reaches every other production secret | 🔒 ____ |
| Supabase login + DB password | Patient data + storage | 🔒 ____ |
| Stripe login + 2FA recovery | Money + payout bank | 🔒 ____ |
| Domain registrar login + 2FA recovery | DNS, email, account recovery anchor | 🔒 ____ |
| GitHub login + 2FA recovery codes | Source + deploy | 🔒 ____ |
| TOTP/authenticator recovery codes (all accounts) | Restores 2FA on a new device | 🔒 ____ |
| Company registration documents | Proves authority to every support desk | 🔒 ____ |
| Off-platform encrypted DB backup (if taken) + its passphrase | Survives a Supabase-account loss | 🔒 ____ (see §4) |

---

## 4. Catastrophic scenarios & recovery

### 4a. Operator unreachable, platform still running
1. Successor reads this file + §3 to recover **Vercel** and **GitHub** first
   (these give deploy control + secret access).
2. If patient-facing harm is accumulating (e.g. Rx/consult queue stalled with no
   doctor), reduce blast radius: enable the relevant service kill switches in
   `/admin/features` (`disable_repeat_scripts`, `disable_consults`) or set
   maintenance mode. Med-cert auto-approval continues without a human.
3. Recover the remaining accounts in §2 (criticality order).

### 4b. Supabase account lost (the backup trap)
- Supabase Point-in-Time Recovery and backups live **inside the Supabase account**.
  Losing the account can defeat them. **Verify the PITR add-on status now**, and
  keep an **independent, encrypted off-platform backup** (e.g. a monthly
  `pg_dump`, ~A$1/mo storage) whose location + passphrase are in §3.
- Recovery requires (a) the off-platform backup **and** (b) the PHI keys from §3.
  One without the other is insufficient.

### 4c. PHI keys lost
- There is **no recovery.** Encrypted PHI columns become permanently unreadable.
  This is why §3 mandates ≥2 independent sealed copies. Treat key custody as the
  single most important continuity control.

### 4d. Domain / email compromised or lost
- Regain the **registrar** account (§2) first; it anchors email and many account
  recoveries. Re-establish SPF/DKIM/DMARC (see docs/OPERATIONS.md / SECURITY.md).
  DMARC policy is `p=reject` — a misconfigured restore can silently drop mail.

---

## 5. Quarterly continuity review (15 min)

- [ ] Every `🔒 ____` in §1–§3 is filled in and current.
- [ ] Each account in §2 still uses a recoverable login + non-SMS 2FA where possible.
- [ ] TOTP recovery codes in §3 are current (regenerate if a device changed).
- [ ] An off-platform encrypted DB backup exists and is < 35 days old (§4b).
- [ ] The nominated successor knows this file exists and can reach the §3 locations.
- [ ] Supabase PITR add-on status verified.

---

*This runbook is referenced from the continuity controls in docs/SECURITY.md and
docs/OPERATIONS.md. It deliberately contains no secret values — only the inventory
and the pointers to where sealed values are kept.*
