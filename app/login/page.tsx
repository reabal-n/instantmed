import { redirect } from 'next/navigation'

const CLERK_SIGN_IN_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'https://accounts.instantmed.com.au/sign-in'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://instantmed.com.au'

export default function LoginRedirect() {
  // Always route through /auth/post-signin for profile linking
  const postSignInUrl = `${APP_URL}/auth/post-signin`
  redirect(`${CLERK_SIGN_IN_URL}?redirect_url=${encodeURIComponent(postSignInUrl)}`)
}
