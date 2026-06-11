# BREAK_GLASS.md — InstantMed continuity & recovery

> **What this is.** "Break glass in case of emergency." If the primary operator is
> unavailable — incapacitated, locked out, unreachable — this is how a trusted
> successor (co-founder, spouse, solicitor-directed agent) regains control of the
> business and, critically, **recovers the patient data, which is useless without
> the encryption keys.**
>
> Contains **no secrets** — only an account inventory and pointers to where the
> sealed values are kept. The values live in the locations named in §2.

## Golden rules

1. **Never paste a secret in this file.** Inventory + pointers only.
2. **The PHI keys (`PHI_MASTER_KEY` + `ENCRYPTION_KEY`) are the crown jewels.**
   Supabase backups are AES-256-GCM ciphertext — without these keys a perfect
   backup is **permanently unreadable**. Losing them is worse than losing the DB,
   so keep ≥2 independent sealed copies. **Never rotate them without a
   re-encryption migration** (`scripts/encrypt-phi-backfill.ts`) — rotation alone
   bricks all PHI.
3. **Fill in the `🔒 ____` blanks** (operator/successor names, logins, 2FA, sealed
   locations). An inventory with blank pointers does not survive an emergency.

Entity/ABN/address are in CLAUDE.md → Platform Identity (support desks ask for the
ABN + company docs as proof of authority; keep those docs with the §2 keys).
**Operator:** 🔒 ____ · **Nominated successor(s):** 🔒 ____

## 1. Account inventory

Recovery method = how a successor proves ownership if the operator's login is gone.
Crit: 🔴 catastrophic · 🟠 major outage · 🟡 degraded.

| Service | Controls | Login / 2FA | Recovery | Crit |
|---------|----------|-------------|----------|------|
| **Domain registrar** (🔒 which: ____) | DNS, MX/email, SPF·DKIM·DMARC | 🔒 ____ | Registrar recovery + entity proof | 🔴 |
| **Vercel** | Hosting, **all prod env vars (the secret store)**, deploys, cron | 🔒 ____ | Support + Git owner | 🔴 |
| **Supabase** | Postgres (all PHI), Auth, Storage | 🔒 ____ | Support + entity proof — **but DB alone ≠ enough, see §2** | 🔴 |
| **GitHub** (`reabal-n/instantmed`) | Source, CI, branch protection | 🔒 ____ | Account recovery / repo transfer | 🔴 |
| **Stripe** | Payments, refunds, payout bank | 🔒 ____ | Support + entity/bank proof | 🔴 |
| **Parchment** | eScript prescribing | 🔒 ____ | Account manager | 🟠 |
| **Resend** | Email | 🔒 ____ | Support; DNS proves domain | 🟠 |
| **Telegram** | The live ops pager | 🔒 bot/chat: ____ | BotFather via owner | 🟠 |
| **Telco** (0450 722 549) | Support line + **SMS-2FA fallback for many accounts** | 🔒 carrier: ____ | Carrier port — a lost SIM cascades | 🟠 |
| **Upstash · Sentry · PostHog** | Rate-limit · errors · analytics | 🔒 ____ | Vendor support | 🟡 |
| **Anthropic · OpenAI** | AI | 🔒 ____ | Console recovery; rotate key | 🟡 |
| **Google** (Ads/GA4/Search Console) | Acquisition + indexing | 🔒 ____ | Account recovery; GSC re-verify via DNS | 🟡 |

> **Single points of failure:** Vercel holds every runtime secret; Supabase holds
> all PHI; the registrar anchors email + many recoveries; the operator's phone is
> the SMS-2FA fallback. Prefer TOTP/hardware 2FA over SMS and store the **TOTP
> recovery codes** in §2.

## 2. Sealed-secret location register (pointers, never values)

Use ≥2 independent locations (e.g. offline password manager **and** a sealed copy
with the solicitor) so no single loss is fatal.

| What | 🔒 Sealed location(s) |
|------|----------------------|
| `PHI_MASTER_KEY` + `ENCRYPTION_KEY` — **PHI unreadable without these** | 🔒 ____ |
| Vercel login + recovery — reaches every prod secret | 🔒 ____ |
| Supabase login + DB password | 🔒 ____ |
| Stripe / domain-registrar / GitHub logins + 2FA recovery | 🔒 ____ |
| TOTP recovery codes (all accounts) | 🔒 ____ |
| Company registration documents | 🔒 ____ |
| Off-platform encrypted DB backup + its passphrase (see §3) | 🔒 ____ |

## 3. Catastrophic recovery

- **Operator unreachable, platform up:** recover **Vercel** + **GitHub** first
  (deploy + secret access). If Rx/consults are piling up unreviewed, pause them in
  `/admin/features` (`disable_repeat_scripts`, `disable_consults`) — med certs
  auto-approve and keep running. (The business-alerts cron also Telegram-pages
  when the Rx/consult queue stalls >24h.)
- **Supabase account lost — the backup trap:** PITR + backups live *inside* the
  Supabase account, so losing it can defeat them. Keep an **independent encrypted
  off-platform backup** (monthly `pg_dump`, ~A$1/mo) and verify the PITR add-on is
  on. Recovery needs the backup **and** the PHI keys — one without the other is
  useless.
- **PHI keys lost:** no recovery — encrypted columns are permanently unreadable.
  This is why §2 mandates ≥2 sealed copies.
- **Domain/email lost:** regain the **registrar** first (it anchors email + many
  recoveries), then restore SPF/DKIM/DMARC — DMARC is `p=reject`, so a bad restore
  silently drops mail.

## 4. Quarterly review (15 min)

- [ ] Every `🔒 ____` filled and current; successor knows this file + can reach §2.
- [ ] Accounts use recoverable logins + non-SMS 2FA where possible; TOTP codes current.
- [ ] Off-platform encrypted DB backup exists and is < 35 days old; PITR add-on verified.

*Referenced from docs/SECURITY.md (key escrow) and docs/OPERATIONS.md (continuity).*
