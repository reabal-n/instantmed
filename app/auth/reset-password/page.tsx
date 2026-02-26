import { redirect } from 'next/navigation'

const CLERK_SIGN_IN_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'https://accounts.instantmed.com.au/sign-in'

// Clerk handles password reset - redirect to Account Portal
export default function ResetPasswordRedirect() {
  redirect(CLERK_SIGN_IN_URL)
}
