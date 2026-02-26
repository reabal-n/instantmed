import { redirect } from 'next/navigation'

const CLERK_SIGN_IN_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'https://accounts.instantmed.com.au/sign-in'

export default function LoginRedirect() {
  redirect(CLERK_SIGN_IN_URL)
}
