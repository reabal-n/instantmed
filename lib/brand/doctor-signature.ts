/**
 * Doctor signature resolver — single source of truth for the signature device.
 *
 * Brand-rehaul spec (docs/BRAND.md §6.2):
 *   - Marketing surfaces: stylised signature mark only, NO readable name
 *     (per CLAUDE.md identity rule "no individual doctor names on marketing
 *     pages"). Acts as a logo-adjacent device.
 *   - Patient comms (cert PDFs, decline emails, dashboard, email signoff):
 *     full "Dr. [Name]" + signature.
 *
 * Multi-doctor scaling: the resolver takes an optional `doctorId`. When
 * provided, future implementations will look up the doctor in the
 * `doctors` table. When omitted, the Medical Director default applies and
 * the marketing-mark variant uses the canonical signature asset shipped at
 * `public/branding/eSignature.png`.
 *
 * Phase 1 (today): the Medical Director default is the only doctor in the
 * system. Phase 2 (when the second clinician onboards): swap the body of
 * `getDoctorSignature()` for a Supabase fetch by `doctorId`, using the
 * existing `doctors` table.
 */

export interface DoctorSignatureData {
  /** Stable identifier. Uses the doctor's auth_user_id when available. */
  id: string
  /** Display-friendly full name with prefix, e.g. "Dr. Jane Smith". */
  fullName: string
  /** Post-nominals shown after the name on patient comms, e.g. "MBBS". */
  credentials?: string
  /** Path to the signature image asset, served from /public. */
  signatureAssetPath: string
  /**
   * Width / height of the signature asset in pixels. Required by next/image
   * for layout stability and to avoid CLS.
   */
  signatureAssetWidth: number
  signatureAssetHeight: number
}

export const MEDICAL_DIRECTOR_SIGNATURE: DoctorSignatureData = {
  id: "medical-director",
  fullName: "Medical Director",
  credentials: "AHPRA-registered",
  signatureAssetPath: "/branding/eSignature.png",
  // Asset native dimensions: 1024 x 250 (rough). Renders are scaled by CSS.
  signatureAssetWidth: 1024,
  signatureAssetHeight: 250,
}

/**
 * Resolves the signature data for a given doctor.
 *
 * Phase 1 returns the Medical Director default for any input. Phase 2 will
 * branch on `doctorId` against the `doctors` table.
 */
export async function getDoctorSignature(
  _doctorId?: string,
): Promise<DoctorSignatureData> {
  return MEDICAL_DIRECTOR_SIGNATURE
}
