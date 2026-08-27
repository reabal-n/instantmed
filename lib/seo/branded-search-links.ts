/**
 * High-value branded search destinations.
 *
 * Google chooses organic sitelinks automatically, but it explicitly uses site
 * structure and internal anchor text as inputs. Keep this list focused on the
 * shortcuts a patient is most likely to need after searching for InstantMed.
 */
export const BRANDED_SEARCH_LINKS = [
  { label: "Medical certificates", href: "/medical-certificate" },
  { label: "Repeat prescriptions", href: "/prescriptions" },
  { label: "Pricing", href: "/pricing" },
  { label: "How InstantMed works", href: "/how-it-works" },
  { label: "Verify a certificate", href: "/verify" },
  { label: "Contact support", href: "/contact" },
] as const
