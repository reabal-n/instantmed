# Quick Start: Setting Admin Role

## Method 1: SQL Script (Recommended for Production)

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- Set admin role for your email
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@instantmed.com.au';

-- Verify it worked
SELECT id, email, full_name, role, clerk_user_id
FROM profiles
WHERE email = 'your-email@instantmed.com.au';
```

**Note:** Replace `your-email@instantmed.com.au` with your actual email address.

---

## Method 2: API Endpoint (Development Only)

**Only works in development/preview environments**

1. Sign up/login with your email
2. Visit: `/api/admin/make-doctor?email=your-email@instantmed.com.au`
3. Must be logged in with that email
4. Must be in `ADMIN_EMAILS` env var

**Limitation:** This endpoint is blocked in production for security.

---

## Method 3: Using Clerk Dashboard

If you need to set role during user creation:

1. Go to Clerk Dashboard → Users
2. Find your user
3. Add metadata: `{ "role": "admin" }`
4. Then update Supabase profile:

```sql
UPDATE profiles
SET role = 'admin'
WHERE clerk_user_id = 'user_xxxxx';
```

---

## Verify Admin Access

After setting admin role:

1. Logout and login again
2. Visit `/admin` or `/doctor`
3. Should have full access

---

## Troubleshooting

**"Unauthorized" error:**
- Check `ADMIN_EMAILS` env var includes your email
- Or ensure `profiles.role = 'admin'` in database

**Role not updating:**
- Clear browser cache/cookies
- Logout and login again
- Check `profiles.clerk_user_id` matches Clerk user ID

