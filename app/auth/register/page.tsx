import { redirect } from 'next/navigation'

const CLERK_SIGN_UP_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'https://accounts.instantmed.com.au/sign-up'

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
  if (redirectTo) {
    url.searchParams.set('redirect_url', redirectTo)
  }
  redirect(url.toString())
}
