import { redirect } from 'next/navigation'

export default async function RegisterRedirect({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; redirect?: string }>
}) {
  const { email, redirect: redirectTo } = await searchParams
  const url = new URL('/sign-up', process.env.NEXT_PUBLIC_APP_URL || 'https://instantmed.com.au')
  if (email) {
    url.searchParams.set('email', email)
  }
  if (redirectTo) {
    url.searchParams.set('redirect', redirectTo)
  }
  redirect(url.pathname + url.search)
}
