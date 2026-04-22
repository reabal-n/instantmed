export type StickerIconName =
  | 'accessibility'
  | 'briefcase'
  | 'certificate'
  | 'checklist'
  | 'checkmark'
  | 'clock'
  | 'email'
  | 'eye'
  | 'fingerprint'
  | 'graduation-cap'
  | 'hair-brush'
  | 'heart'
  | 'heart-with-pulse'
  | 'hospital'
  | 'info'
  | 'lightning'
  | 'lock'
  | 'map-pin'
  | 'medical-doctor'
  | 'medical-history'
  | 'no-mobile'
  | 'open-book'
  | 'people'
  | 'phone'
  | 'pill-bottle'
  | 'privacy'
  | 'pulse'
  | 'scales'
  | 'security-shield'
  | 'sent'
  | 'server'
  | 'speech-bubble'
  | 'stethoscope'
  | 'synchronize'
  | 'user-check'
  | 'verified-badge'
  | 'warning'
  | 'bandage'
  | 'brain'
  | 'diabetes'
  | 'lungs'
  | 'pill'
  | 'syringe'
  | 'thermometer'
  | 'wallet'
  | 'laptop'

interface StickerIconProps {
  name: StickerIconName
  size?: number
  className?: string
  loading?: 'lazy' | 'eager'
}

export function StickerIcon({ name, size = 48, className, loading = 'lazy' }: StickerIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/stickers/${name}.svg`}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      alt=""
      loading={loading}
    />
  )
}
