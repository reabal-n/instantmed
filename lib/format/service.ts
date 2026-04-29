export function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    med_certs: "Medical Certificates",
    repeat_rx: "Repeat Prescriptions",
    consult: "Consultations",
    consults: "Consultations",
    referrals: "Referrals",
    unknown: "Other",
  }
  return labels[type] || type
}
