export interface SignInFieldErrors {
  email: string
  password: string
}

export function validateSignInCredentials(
  email: string,
  password: string,
): SignInFieldErrors {
  const normalizedEmail = email.trim().toLowerCase()

  return {
    email:
      normalizedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        ? ""
        : "Please enter a valid email address.",
    password: password ? "" : "Please enter your password.",
  }
}
