type AuthErrorLike = {
  message?: string
  code?: string
}

type PasswordAuthClient = {
  auth: {
    signInWithPassword(credentials: {
      email: string
      password: string
    }): Promise<{ error: AuthErrorLike | null }>
    updateUser(attributes: {
      password: string
    }): Promise<{ error: AuthErrorLike | null }>
  }
}

type PasswordChangeInput = {
  email: string
  currentPassword: string
  newPassword: string
}

export async function changeAuthenticatedPassword(
  client: PasswordAuthClient,
  input: PasswordChangeInput,
): Promise<{ success: boolean; error: string | null }> {
  const email = input.email.trim().toLowerCase()

  if (!email || !input.currentPassword || !input.newPassword) {
    return { success: false, error: "Complete all password fields." }
  }

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: input.currentPassword,
  })

  if (signInError) {
    return { success: false, error: "Current password is incorrect." }
  }

  const { error: updateError } = await client.auth.updateUser({
    password: input.newPassword,
  })

  if (!updateError) {
    return { success: true, error: null }
  }

  if (updateError.code === "same_password") {
    return {
      success: false,
      error: "Choose a password you haven't used for this account.",
    }
  }

  return {
    success: false,
    error: "We couldn't change your password. Please try again.",
  }
}
