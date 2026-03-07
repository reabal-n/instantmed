import { redirect } from 'next/navigation'

const CLERK_SIGN_UP_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'https://accounts.instantmed.com.au/sign-up'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://instantmed.com.au'

export default async function RegisterRedirect({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; redirect?: string }>
}) {
  const { email, redirect: redirectTo } = await searchParams
  const url = new URL(CLERK_SIGN_UP_URL)
  if (email) {
    url.searchParams.set('email_address', email)
  }
  // Always route through /auth/post-signin for profile linking
  url.searchParams.set('redirect_url', redirectTo || `${APP_URL}/auth/post-signin`)
  redirect(url.toString())
}
