export interface SignInContext {
  description: string
  heading: string
  isPaymentRecovery: boolean
  submitLabel: string
}

const DEFAULT_CONTEXT: SignInContext = {
  description: "Sign in to your account",
  heading: "Welcome back",
  isPaymentRecovery: false,
  submitLabel: "Sign in",
}

export function getSignInContext(redirectUrl: string): SignInContext {
  try {
    const destination = new URL(redirectUrl || "/", "https://instantmed.local")
    const isPaymentRecovery =
      /^\/patient\/intakes\/[^/]+$/.test(destination.pathname) &&
      destination.searchParams.get("retry") === "true"

    if (!isPaymentRecovery) return DEFAULT_CONTEXT

    return {
      description: "Your request is saved — we'll bring you straight back.",
      heading: "Sign in to finish payment",
      isPaymentRecovery: true,
      submitLabel: "Sign in to finish payment",
    }
  } catch {
    return DEFAULT_CONTEXT
  }
}
