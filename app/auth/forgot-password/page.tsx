import { redirect } from 'next/navigation'

// Clerk handles password reset - redirect to Account Portal
export default function ForgotPasswordRedirect() {
  redirect('https://accounts.instantmed.com.au/sign-in')
}
