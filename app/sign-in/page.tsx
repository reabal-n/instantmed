import { redirect } from 'next/navigation'

export default function SignInRedirect() {
  redirect('https://accounts.instantmed.com.au/sign-in')
}
