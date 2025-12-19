export async function updateMedCertDraftData(draftId: string, data: unknown) {
  return { success: false }
}

export async function updatePathologyDraftData(draftId: string, data: unknown) {
  return { success: false }
}

export async function getDraftById(draftId: string) {
  return null
}

export async function getOrCreateMedCertDraftForRequest(requestId: string) {
  return { id: '', data: {} }
}

export async function getOrCreatePathologyDraftForRequest(requestId: string) {
  return { id: '', data: {} }
}

export async function getLatestDocumentForRequest(requestId: string) {
  return null
}

export async function createGeneratedDocument(data: unknown) {
  return { id: '', success: false }
}

export const documents = {}
