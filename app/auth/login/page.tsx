import { redirect } from 'next/navigation'

export default function LoginRedirect() {
  redirect('https://accounts.instantmed.com.au/sign-in')
}
