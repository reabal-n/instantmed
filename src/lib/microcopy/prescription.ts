export const RX_MICROCOPY = {
  type: {
    heading: 'Prescription Type',
    subtitle: 'Select the type of prescription you need',
    repeat: {
      label: 'Repeat Prescription',
      description: 'I need a repeat of a medication I\'m currently taking',
    },
    new: {
      label: 'New Prescription',
      description: 'I need a new medication prescribed',
    },
  },
  medication: {
    heading: 'Medication Name',
    headingRepeat: 'Medication Name',
    subtitle: 'What medication do you need?',
    placeholder: 'Enter medication name',
    placeholderRepeat: 'Enter medication name',
  },
  condition: {
    heading: 'Medical Condition',
    headingNew: 'Medical Condition',
    subtitle: 'What condition is this medication for?',
    otherPlaceholder: 'Please describe your condition',
  },
  duration: {
    heading: 'Duration',
  },
  control: {
    heading: 'Control',
  },
  sideEffects: {
    heading: 'Side Effects',
  },
  safety: {
    heading: 'Safety Questions',
    subtitle: 'Please answer these questions',
    knockoutTitle: 'Safety Check',
    knockoutBody: 'For your safety, please contact a healthcare provider',
    knockoutCta: 'Find Healthcare Services',
  },
  medicare: {
    heading: 'Medicare Details',
    subtitle: 'Please provide your Medicare information',
    numberLabel: 'Medicare Number',
    numberPlaceholder: '1234 56789 1',
    irnLabel: 'IRN',
    irnTooltip: 'Individual Reference Number',
  },
  signup: {
    headingNew: 'Create Account',
    headingExisting: 'Sign In',
    subtitle: 'Please sign in to continue',
  },
  review: {
    heading: 'Review Your Request',
    subtitle: 'Please review your information',
    medication: 'Medication',
    condition: 'Condition',
    duration: 'Duration',
  },
  payment: {
    heading: 'Payment',
    subtitle: 'Complete your payment',
    price: '$49.00',
    includes: ['Doctor review', 'Prescription sent to pharmacy'],
    disclaimer: 'Payment is secure and encrypted',
    processing: 'Processing...',
    cta: 'Pay Now',
  },
  nav: {
    continue: 'Continue',
    back: 'Back',
  },
  errors: {
    generic: 'An error occurred. Please try again.',
    controlled: 'This medication requires special handling',
  },
  controlled: {
    title: 'Controlled Substance',
    body: 'This medication is a controlled substance',
    affected: [] as string[],
  },
  doctorReview: 'Your request will be reviewed by a doctor',
}

export function isControlledSubstance(medication: string): boolean {
  // Stub implementation - check if medication is a controlled substance
  return false
}
