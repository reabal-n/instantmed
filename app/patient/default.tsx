/**
 * Fallback for the children slot when a parallel route (e.g. @modal/new-request)
 * is active at /patient/new-request. The modal uses fixed positioning so children
 * rendering null here is fine — the backdrop covers everything.
 */
export default function PatientDefault() {
  return null
}
