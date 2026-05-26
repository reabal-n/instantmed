/**
 * Single source of truth for the cert-approval undo window length.
 *
 * Lives in a plain module (not a "use server" file) so the constant can be
 * imported from both the server action (`app/actions/undo-cert-approval.ts`),
 * the cert approval pipeline (`lib/clinical/execute-cert-approval.ts`), and
 * the client toast component (`components/doctor/cert-approval-undo-toast.tsx`)
 * without tripping Next.js's "only async exports from use-server files" rule.
 *
 * When changing this value, the change applies to all three call sites
 * automatically. Keep it tight; the email dispatcher polls every minute, so
 * windows under 30s give the doctor too little time to react and windows over
 * a couple of minutes risk the operator forgetting they have an undo open.
 */
export const UNDO_CERT_WINDOW_SECONDS = 30
