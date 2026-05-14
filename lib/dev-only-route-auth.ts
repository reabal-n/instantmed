import { timingSafeEqual } from "crypto"

export type E2ESecretVerification =
  | { ok: true }
  | { ok: false; error: string; status: 401 | 500 }

export function verifyE2ESecret(request: Request): E2ESecretVerification {
  const e2eSecret = process.env.E2E_SECRET
  const providedSecret = request.headers.get("X-E2E-SECRET")

  if (!e2eSecret) {
    return { ok: false, error: "E2E_SECRET not configured", status: 500 }
  }

  if (
    !providedSecret ||
    providedSecret.length !== e2eSecret.length ||
    !timingSafeEqual(Buffer.from(providedSecret), Buffer.from(e2eSecret))
  ) {
    return { ok: false, error: "Invalid E2E secret", status: 401 }
  }

  return { ok: true }
}
