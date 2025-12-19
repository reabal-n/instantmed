import type { ConsentDefinition } from './types'
import type { ConsentType } from '@/types/database'

// ============================================
// CONSENT DEFINITIONS
// ============================================

export const consentDefinitions: ConsentDefinition[] = [
  {
    type: 'telehealth_terms',
    title: 'Telehealth Consultation Terms',
    summary: 'I understand this is an online medical consultation and I consent to receiving healthcare services via telehealth.',
    fullText: `TELEHEALTH CONSULTATION TERMS AND CONDITIONS

By proceeding with this consultation, you acknowledge and agree that:

1. NATURE OF TELEHEALTH
This is an online medical consultation conducted via our secure platform. You understand that telehealth has limitations compared to in-person consultations, including the inability to perform physical examinations.

2. APPROPRIATENESS
Telehealth may not be appropriate for all medical conditions. Our doctors will assess whether your condition is suitable for online consultation and may refer you to in-person care if needed.

3. EMERGENCY SITUATIONS
Telehealth is not suitable for emergencies. If you experience a medical emergency, call 000 immediately or attend your nearest emergency department.

4. DOCTOR-PATIENT RELATIONSHIP
A doctor-patient relationship will be established for the purpose of this consultation. Your treating doctor is an Australian-registered medical practitioner.

5. INFORMATION ACCURACY
You agree to provide accurate and complete information about your medical history, current symptoms, and medications.

6. TECHNICAL REQUIREMENTS
You are responsible for ensuring you have appropriate technology and internet connectivity to participate in the consultation.

Version: 1.0
Last Updated: January 2024`,
    version: '1.0',
    required: true,
  },
  {
    type: 'privacy_policy',
    title: 'Privacy & Sensitive Information',
    summary: 'I consent to the collection, use, and storage of my personal and sensitive health information as described in the Privacy Policy.',
    fullText: `PRIVACY AND SENSITIVE INFORMATION CONSENT

By proceeding, you consent to:

1. COLLECTION OF INFORMATION
We collect personal information including your name, contact details, date of birth, Medicare details, and health information necessary to provide medical services.

2. SENSITIVE HEALTH INFORMATION
Under the Privacy Act 1988, health information is classified as sensitive information. We will handle this information with additional care and only collect it with your consent.

3. USE OF INFORMATION
Your information will be used to:
- Provide medical consultations and treatment
- Generate prescriptions, referrals, or certificates
- Communicate with you about your healthcare
- Comply with legal and regulatory requirements
- Improve our services (de-identified data only)

4. DISCLOSURE
We may disclose your information to:
- Pharmacies (for prescriptions)
- Pathology and imaging providers
- Specialists (for referrals)
- Medicare and PBS systems
- As required by law

5. DATA SECURITY
Your data is encrypted and stored securely on Australian servers. We implement industry-standard security measures to protect your information.

6. YOUR RIGHTS
You have the right to access, correct, and request deletion of your personal information. Contact privacy@instantmed.com.au for requests.

7. RETENTION
Medical records are retained for the minimum period required by law (typically 7 years, or until a minor patient turns 25).

Version: 1.0
Last Updated: January 2024`,
    version: '1.0',
    required: true,
  },
  {
    type: 'fee_agreement',
    title: 'Fees & Refund Policy',
    summary: 'I understand the consultation fee, that it is non-refundable once a doctor has reviewed my request, and that Medicare rebates do not apply.',
    fullText: `FEES AND REFUND POLICY

1. CONSULTATION FEE
The fee for this consultation is displayed before checkout. This is a private consultation fee and Medicare rebates do not apply.

2. WHAT'S INCLUDED
Your fee includes:
- Review of your request by an Australian-registered doctor
- Any required documentation (certificate, prescription, referral)
- Secure delivery of documents via email and patient portal
- Follow-up messaging if the doctor needs clarification

3. NOT INCLUDED
Additional costs you may incur:
- Prescription medications (payable at pharmacy)
- Pathology or imaging tests
- Specialist consultation fees
- Any required follow-up consultations

4. REFUND POLICY
- Full refund if you cancel before a doctor reviews your request
- No refund once a doctor has begun reviewing your request
- Full refund if we are unable to assist with your request and decline it
- Partial refund at our discretion for service issues

5. PAYMENT
Payment is required before your request enters the doctor queue. We accept major credit/debit cards via our secure payment processor (Stripe).

6. PRIORITY PROCESSING
Optional priority processing is available for an additional fee. This moves your request to the front of the queue but does not guarantee approval.

Version: 1.0
Last Updated: January 2024`,
    version: '1.0',
    required: true,
  },
  {
    type: 'escalation_agreement',
    title: 'Escalation & Limitations',
    summary: 'I understand that if my request cannot be approved online, I may be referred for a phone/video consultation or to in-person care, and I accept these limitations.',
    fullText: `ESCALATION AND SERVICE LIMITATIONS

1. CLINICAL ASSESSMENT
Our doctors make independent clinical decisions. Not all requests can be approved through online consultation alone.

2. ESCALATION PATHWAY
If your request cannot be approved online, you may be:
- Asked to provide additional information
- Offered a phone or video consultation (additional fee may apply)
- Referred to in-person care with your GP or specialist
- Referred to emergency services if urgent

3. REASONS FOR ESCALATION
Common reasons include:
- Complex medical history
- Potential drug interactions
- Symptoms requiring physical examination
- Regulatory requirements for certain medications
- Clinical concerns identified during review

4. NO GUARANTEE OF APPROVAL
Submitting a request and paying the consultation fee does not guarantee approval. Our doctors must be satisfied that treatment is clinically appropriate and safe.

5. CONTROLLED MEDICATIONS
We do not prescribe Schedule 8 medications (e.g., opioids, benzodiazepines, stimulants) or other restricted substances through this platform.

6. EMERGENCY SITUATIONS
This service is not for emergencies. If you are experiencing a medical emergency, call 000 or attend emergency immediately.

7. ONGOING CARE
For ongoing conditions, we recommend establishing care with a regular GP who can provide continuity of care.

Version: 1.0
Last Updated: January 2024`,
    version: '1.0',
    required: true,
  },
  {
    type: 'medication_consent',
    title: 'Medication Consent',
    summary: 'I understand the risks and benefits of the requested medication and consent to it being prescribed if clinically appropriate.',
    fullText: `MEDICATION CONSENT

By requesting prescription medication, you acknowledge:

1. DOCTOR'S DISCRETION
The prescribing decision rests with the treating doctor. You may not receive the specific medication requested if the doctor determines it is not appropriate.

2. INFORMATION PROVIDED
You have provided accurate information about:
- Your medical history and current conditions
- All medications you are currently taking
- Any known allergies or adverse reactions
- Previous use of this or similar medications

3. UNDERSTANDING OF MEDICATION
You understand:
- The purpose of the medication
- How to take it correctly
- Potential side effects and what to do if they occur
- Any lifestyle modifications required (e.g., avoiding alcohol)

4. RESPONSIBILITY
You agree to:
- Follow the prescribed dosage instructions
- Read the Consumer Medicine Information (CMI)
- Report any adverse effects to a healthcare provider
- Not share your medication with others
- Store medication safely and securely

5. CONTRACEPTION (where applicable)
For certain medications, you confirm you are using appropriate contraception if there is any risk of pregnancy, as some medications can harm unborn babies.

6. MONITORING
Some medications require monitoring. You agree to attend any recommended follow-up appointments or tests.

Version: 1.0
Last Updated: January 2024`,
    version: '1.0',
    required: false, // Only required for prescription services
    serviceTypes: ['weight_loss', 'mens_health', 'womens_health', 'common_scripts'],
  },
  {
    type: 'treatment_consent',
    title: 'Treatment Consent',
    summary: 'I consent to the proposed treatment plan and understand the expected outcomes and potential risks.',
    fullText: `TREATMENT CONSENT

By proceeding with treatment, you acknowledge:

1. INFORMED CONSENT
You have been provided with information about:
- The nature of the proposed treatment
- Expected benefits and outcomes
- Potential risks and side effects
- Alternative treatment options
- Consequences of not receiving treatment

2. QUESTIONS ANSWERED
You have had the opportunity to ask questions and have them answered satisfactorily.

3. VOLUNTARY CONSENT
Your consent is given voluntarily, without coercion or undue influence.

4. RIGHT TO WITHDRAW
You may withdraw consent at any time. Withdrawal does not affect any treatment already provided.

5. SECOND OPINION
You have the right to seek a second opinion from another healthcare provider.

Version: 1.0
Last Updated: January 2024`,
    version: '1.0',
    required: false,
    serviceTypes: ['weight_loss', 'mens_health', 'womens_health'],
  },
]

// Get consents required for a specific service type
export function getRequiredConsents(serviceType: string): ConsentDefinition[] {
  return consentDefinitions.filter((consent) => {
    // If no service types specified, applies to all
    if (!consent.serviceTypes || consent.serviceTypes.length === 0) {
      return consent.required
    }
    // Check if service type matches and consent is required
    return consent.serviceTypes.includes(serviceType) || consent.required
  })
}

// Get all consents for a service (required + optional)
export function getConsentsForService(serviceType: string): ConsentDefinition[] {
  return consentDefinitions.filter((consent) => {
    if (!consent.serviceTypes || consent.serviceTypes.length === 0) {
      return true
    }
    return consent.serviceTypes.includes(serviceType)
  })
}

// Generate hash of consent text for audit trail
export function generateConsentHash(text: string): string {
  // Simple hash for demo - in production use crypto.subtle.digest
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(16, '0')}`
}
