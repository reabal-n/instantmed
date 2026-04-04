# High-Priority Fixes + Repeat Script Subscription

**Date:** 2026-04-04
**Status:** Approved
**Scope:** Audit items 5-9 + monthly subscription for repeat prescriptions

## 1. Repeat Script Subscription ($19.95/mo)

### Model
Pre-paid monthly credit. Patient subscribes at $19.95/month (vs $29.95 one-off). Gets one repeat script request per billing cycle. Unused credits expire at cycle end. Extra scripts are $29.95 each.

### UX
- Checkout step for repeat scripts: toggle (default ON) — "Subscribe & save"
- Toggle ON → Stripe `mode: "subscription"`, first script processed immediately
- Toggle OFF → existing one-time `mode: "payment"` at $29.95
- Returning subscribers with credits skip payment entirely

### Stripe
- New recurring Price: `STRIPE_PRICE_REPEAT_RX_MONTHLY` ($19.95/mo AUD)
- Subscription checkout with `subscription_data.metadata`
- Webhooks: `invoice.payment_succeeded` (reset credits), `customer.subscription.deleted` (mark cancelled)

### DB
- `subscriptions` table: id, profile_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end, credits_remaining, cancelled_at, created_at, updated_at

### Dashboard
- Subscription status card with next billing date, credits remaining
- "Manage subscription" → Stripe Customer Portal

## 2. Priority Fee ($9.95 Express)
- Toggle on checkout step (default OFF): "Express Review — $9.95"
- Adds second line_item to Stripe session
- Sets `is_priority = true` on intake
- Priority intakes sort to top of doctor queue
- New env var: `STRIPE_PRICE_PRIORITY_FEE`

## 3. Specialty Page CTAs
- Weight loss CTAs → `/request?service=consult&subtype=weight_loss`
- Hair loss CTAs → `/request?service=consult&subtype=hair_loss`

## 4. Pricing Page — Add Consults
- Third card: "Consultations" from $39.95
- Grid → `md:grid-cols-3`
- Update "no subscriptions" messaging

## 5. Post-Decline Re-engagement Email
- Template sent 2h after decline via cron
- Suggests alternative service, GP visit, contact support

## 6. Navbar Updates
- Add "Pricing" to desktop nav
- Add Weight Loss + Hair Loss to Services dropdown
- Mirror to mobile menu

## 7. Doctor Mobile Nav
- Add "Repeat Rx" to doctorMoreItems

## 8. About Page
- Remove tech stack section
