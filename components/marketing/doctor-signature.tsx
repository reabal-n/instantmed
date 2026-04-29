import Image from "next/image"

import {
  type DoctorSignatureData,
  getDoctorSignature,
} from "@/lib/brand/doctor-signature"
import { cn } from "@/lib/utils"

interface DoctorSignatureProps {
  /**
   * Doctor identifier. Omit on marketing surfaces to render the Medical
   * Director default. Multi-doctor patient-comms surfaces pass the actual
   * treating doctor's id.
   */
  doctorId?: string
  /**
   * Visual variant.
   *  - `mark`: signature image only, no readable name. Use on marketing
   *    surfaces (homepage footer, about page) per CLAUDE.md identity rule
   *    "no individual doctor names on marketing pages."
   *  - `mark-and-name`: signature plus "Dr. [Name], [credentials]" line.
   *    Use on patient comms (cert PDF preview, decline email rendering,
   *    dashboard signoff, email footer for transactional comms).
   */
  variant?: "mark" | "mark-and-name"
  /** Visual size hint. Tuned for the typical surfaces each variant lives on. */
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_CLASS: Record<NonNullable<DoctorSignatureProps["size"]>, string> = {
  sm: "h-8",
  md: "h-12",
  lg: "h-16",
}

/**
 * DoctorSignature — signature brand device #2 (docs/BRAND.md §6.2).
 *
 * Async server component (resolves the doctor record on the server). The
 * `mark` variant treats the image as decorative (no readable name visible
 * per CLAUDE.md identity rule); the `mark-and-name` variant exposes the
 * full doctor name for patient comms surfaces.
 */
export async function DoctorSignature({
  doctorId,
  variant = "mark",
  size = "md",
  className,
}: DoctorSignatureProps) {
  const data = await getDoctorSignature(doctorId)
  return (
    <DoctorSignatureView data={data} variant={variant} size={size} className={className} />
  )
}

interface DoctorSignatureViewProps {
  data: DoctorSignatureData
  variant: "mark" | "mark-and-name"
  size: "sm" | "md" | "lg"
  className?: string
}

/**
 * Pure-presentational view. Exposed for surfaces that have already resolved
 * the doctor (e.g. cert PDF rendering pipeline that already loads the
 * doctor record for other reasons).
 */
export function DoctorSignatureView({
  data,
  variant,
  size,
  className,
}: DoctorSignatureViewProps) {
  const showName = variant === "mark-and-name"
  const sizeClass = SIZE_CLASS[size]

  return (
    <figure
      className={cn(
        "inline-flex flex-col items-start gap-1 leading-none",
        className,
      )}
    >
      <Image
        src={data.signatureAssetPath}
        alt={showName ? `Signature of ${data.fullName}` : ""}
        width={data.signatureAssetWidth}
        height={data.signatureAssetHeight}
        priority={false}
        className={cn(
          "w-auto select-none",
          sizeClass,
          // Marketing variant treats the image as a decorative mark; soften
          // it slightly so it reads as a brand device rather than evidence
          // of a specific person.
          showName ? "" : "opacity-90",
        )}
        // The signature is functionally non-interactive; suppress browser
        // dragging which would expose the file path on save.
        draggable={false}
      />
      {showName ? (
        <figcaption className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{data.fullName}</span>
          {data.credentials ? <span>, {data.credentials}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  )
}
