import { redirect } from 'next/navigation'

// Clerk handles password reset - redirect to Account Portal
export default function ResetPasswordRedirect() {
  redirect('https://accounts.instantmed.com.au/sign-in')
}
