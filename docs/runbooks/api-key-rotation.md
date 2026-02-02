# API Key Rotation

## Zero-Downtime Rotation Process

### INTERNAL_API_KEY
1. Generate new key: `openssl rand -base64 32`
2. Add `INTERNAL_API_KEY_NEW=<new-key>` to Vercel env vars
3. Deploy — both old and new keys work during overlap
4. Verify system works with new key
5. Update `INTERNAL_API_KEY=<new-key>` in Vercel
6. Remove `INTERNAL_API_KEY_NEW`
7. Deploy final

### CRON_SECRET
1. Generate new secret: `openssl rand -base64 32`
2. Update `CRON_SECRET` in Vercel env vars
3. Deploy immediately (Vercel cron reads env at runtime)

### ENCRYPTION_KEY / PHI_MASTER_KEY
**CRITICAL: Do NOT rotate without data migration plan**
1. Contact engineering lead
2. Plan backfill/re-encryption before rotation
3. Use scripts/encrypt-phi-backfill.ts for re-encryption

### Stripe Keys
1. Generate new keys in Stripe dashboard
2. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel
3. Deploy
4. Verify webhook delivery in Stripe dashboard

### Clerk Keys
1. Generate new keys in Clerk dashboard
2. Update `CLERK_SECRET_KEY` in Vercel
3. Deploy
4. Verify auth flows work
