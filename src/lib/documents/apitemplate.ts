export type PathologyDraftData = Record<string, unknown>
export type PathologySubtype = string

export async function generateMedCertPdfFromDraft(draftId: string) {
  return { success: false, url: null }
}

export async function generatePathologyReferralPdfFromDraft(draftId: string) {
  return { success: false, url: null }
}

export async function testApiTemplateConnection() {
  return { success: false, connected: false }
}

export function getApiTemplate() {
  return {}
}
