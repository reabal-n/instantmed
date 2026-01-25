import { redirect } from 'next/navigation'

const CLERK_SIGN_UP_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'https://accounts.instantmed.com.au/sign-up'

export default function RegisterRedirect() {
  redirect(CLERK_SIGN_UP_URL)
}
