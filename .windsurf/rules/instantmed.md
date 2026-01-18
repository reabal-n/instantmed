---
trigger: always_on
---

PROJECT RULES (InstantMed)

1) Single source of truth for env
- Local dev uses .env.local only.
- Don’t duplicate Stripe vars across .env.* files.
- If duplicates exist, delete/comment duplicates—don’t guess precedence.

2) Stripe sanity rule
- If Stripe throws “No such price”:
  a) Locate the source of that price ID (rg STRIPE_PRICE + code path)
  b) Log what runtime sees (process.env.STRIPE_PRICE_MEDCERT)
  c) Confirm secret key + price ID belong to the same Stripe account

3) Auth/Profile rule
- Don’t call ensureProfile from client components unless via a safe server action/route.
- If imports fail, first: rg "ensure-profile" and list the actual file path.

4) Vercel deploy discipline
- Fix locally until build passes.
- Then push once. No push-and-pray loops.

5) Workflow discipline
- When you propose a fix, include:
  - The exact files you’ll edit
  - The exact commands you’ll run
  - The expected output if it worked

6) Use brand voice rules for all copy 