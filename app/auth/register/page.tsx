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
  // ALWAYS route through /auth/post-signin for profile linking.
  // If a redirect param was provided, pass it as a query param so
  // post-signin can forward there after linking the profile.
  const postSignInUrl = new URL(`${APP_URL}/auth/post-signin`)
  if (redirectTo) {
    postSignInUrl.searchParams.set('redirect', redirectTo)
  }
  url.searchParams.set('redirect_url', postSignInUrl.toString())
  redirect(url.toString())
}
