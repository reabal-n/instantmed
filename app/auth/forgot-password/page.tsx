import { redirect } from 'next/navigation'

// Supabase handles password reset via magic link from the sign-in page
export default function ForgotPasswordRedirect() {
  redirect('/sign-in')
}
