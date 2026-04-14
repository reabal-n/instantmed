import type { FC, SVGProps } from 'react'

import AccessibilitySVG from './accessibility.svg'
import BriefcaseSVG from './briefcase.svg'
import CertificateSVG from './certificate.svg'
import ChecklistSVG from './checklist.svg'
import CheckmarkSVG from './checkmark.svg'
import ClockSVG from './clock.svg'
import EmailSVG from './email.svg'
import EyeSVG from './eye.svg'
import FingerprintSVG from './fingerprint.svg'
import GraduationCapSVG from './graduation-cap.svg'
import HairBrushSVG from './hair-brush.svg'
import HeartSVG from './heart.svg'
import HeartWithPulseSVG from './heart-with-pulse.svg'
import HospitalSVG from './hospital.svg'
import InfoSVG from './info.svg'
import LightningSVG from './lightning.svg'
import LockSVG from './lock.svg'
import MapPinSVG from './map-pin.svg'
import MedicalDoctorSVG from './medical-doctor.svg'
import MedicalHistorySVG from './medical-history.svg'
import NoMobileSVG from './no-mobile.svg'
import OpenBookSVG from './open-book.svg'
import PeopleSVG from './people.svg'
import PhoneSVG from './phone.svg'
import PillBottleSVG from './pill-bottle.svg'
import PrivacySVG from './privacy.svg'
import PulseSVG from './pulse.svg'
import ScalesSVG from './scales.svg'
import SecurityShieldSVG from './security-shield.svg'
import SentSVG from './sent.svg'
import ServerSVG from './server.svg'
import SpeechBubbleSVG from './speech-bubble.svg'
import StethoscopeSVG from './stethoscope.svg'
import SynchronizeSVG from './synchronize.svg'
import UserCheckSVG from './user-check.svg'
import VerifiedBadgeSVG from './verified-badge.svg'
import WarningSVG from './warning.svg'

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

const ICON_MAP: Record<StickerIconName, FC<SVGProps<SVGSVGElement>>> = {
  'accessibility': AccessibilitySVG,
  'briefcase': BriefcaseSVG,
  'certificate': CertificateSVG,
  'checklist': ChecklistSVG,
  'checkmark': CheckmarkSVG,
  'clock': ClockSVG,
  'email': EmailSVG,
  'eye': EyeSVG,
  'fingerprint': FingerprintSVG,
  'graduation-cap': GraduationCapSVG,
  'hair-brush': HairBrushSVG,
  'heart': HeartSVG,
  'heart-with-pulse': HeartWithPulseSVG,
  'hospital': HospitalSVG,
  'info': InfoSVG,
  'lightning': LightningSVG,
  'lock': LockSVG,
  'map-pin': MapPinSVG,
  'medical-doctor': MedicalDoctorSVG,
  'medical-history': MedicalHistorySVG,
  'no-mobile': NoMobileSVG,
  'open-book': OpenBookSVG,
  'people': PeopleSVG,
  'phone': PhoneSVG,
  'pill-bottle': PillBottleSVG,
  'privacy': PrivacySVG,
  'pulse': PulseSVG,
  'scales': ScalesSVG,
  'security-shield': SecurityShieldSVG,
  'sent': SentSVG,
  'server': ServerSVG,
  'speech-bubble': SpeechBubbleSVG,
  'stethoscope': StethoscopeSVG,
  'synchronize': SynchronizeSVG,
  'user-check': UserCheckSVG,
  'verified-badge': VerifiedBadgeSVG,
  'warning': WarningSVG,
}

interface StickerIconProps extends SVGProps<SVGSVGElement> {
  name: StickerIconName
  size?: number
}

export function StickerIcon({ name, size = 48, className, ...props }: StickerIconProps) {
  const IconComponent = ICON_MAP[name]
  return <IconComponent width={size} height={size} className={className} aria-hidden="true" {...props} />
}
