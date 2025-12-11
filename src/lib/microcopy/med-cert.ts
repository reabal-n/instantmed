export const MICROCOPY = {
  type: {
    heading: 'Certificate Type',
    subtitle: 'What type of certificate do you need?',
    work: {
      label: 'Work',
      description: 'For work-related sick leave',
    },
    uni: {
      label: 'University',
      description: 'For university-related absence',
    },
    carer: {
      label: "Carer's Leave",
      description: 'For caring for a family member',
    },
  },
  duration: {
    heading: 'Duration',
    subtitle: 'How many days do you need?',
    options: {
      '1': '1 day',
      '2': '2 days',
      '3': '3 days',
      '4-7': '4-7 days',
      '1-2weeks': '1-2 weeks',
      'specific': 'Specific dates',
    },
  },
  startDate: {
    heading: 'Start Date',
    subtitle: 'When did your illness start?',
  },
  symptoms: {
    heading: 'Symptoms',
    subtitle: 'What symptoms are you experiencing?',
  },
  notes: {
    heading: 'Additional Notes',
    subtitle: 'Any additional information?',
  },
  safety: {
    heading: 'Safety Questions',
    subtitle: 'Please answer these questions',
  },
  patientDetails: {
    heading: 'Patient Details',
    subtitle: 'Please provide your details',
  },
  review: {
    heading: 'Review Your Request',
    subtitle: 'Please review your information',
  },
  payment: {
    heading: 'Payment',
    subtitle: 'Complete your payment',
    price: '$19.95',
  },
  medicare: {
    heading: 'Medicare Details',
    subtitle: 'Please provide your Medicare information',
    errors: {
      incomplete: (remaining: number) => `Please enter ${remaining} more digits`,
      startDigit: 'Medicare number must start with 2-6',
      checksum: 'Invalid Medicare number',
    },
  },
  errors: {
    generic: 'An error occurred. Please try again.',
    signIn: 'Sign in failed. Please try again.',
    payment: 'Payment failed. Please try again.',
  },
}
