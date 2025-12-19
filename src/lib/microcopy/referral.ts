export const REFERRAL_COPY = {
  type: {
    heading: 'Referral Type',
    subtitle: 'Select the type of referral you need',
    blood: {
      label: 'Blood Test',
      description: 'Get a referral for blood tests',
    },
    imaging: {
      label: 'Imaging',
      description: 'Get a referral for imaging',
    },
  },
  bloodTests: {
    heading: 'Blood Test Type',
    subtitle: 'What type of blood test do you need?',
    options: [
      { id: 'full', label: 'Full Blood Count' },
      { id: 'liver', label: 'Liver Function' },
      { id: 'kidney', label: 'Kidney Function' },
      { id: 'thyroid', label: 'Thyroid Function' },
      { id: 'vitamin', label: 'Vitamin Levels' },
      { id: 'other', label: 'Other' },
    ],
    otherPlaceholder: 'Please specify',
  },
  imaging: {
    heading: 'Imaging Type',
    subtitle: 'What type of imaging do you need?',
    region: {
      options: [
        { id: 'head', label: 'Head/Neck' },
        { id: 'chest', label: 'Chest' },
        { id: 'abdomen', label: 'Abdomen' },
        { id: 'pelvis', label: 'Pelvis' },
        { id: 'limbs', label: 'Limbs' },
      ],
    },
    options: [
      { id: 'xray', label: 'X-Ray' },
      { id: 'ct', label: 'CT Scan' },
      { id: 'mri', label: 'MRI' },
      { id: 'ultrasound', label: 'Ultrasound' },
      { id: 'other', label: 'Other' },
    ],
  },
  reason: {
    heading: 'Reason',
    subtitle: 'Why do you need this referral?',
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
    errors: {
      startDigit: 'Medicare number must start with 2-6',
      incomplete: (remaining: number) => `Please enter ${remaining} more digits`,
      checksum: 'Invalid Medicare number',
    },
  },
  signup: {
    headingNew: 'Create Account',
    headingExisting: 'Sign In',
    subtitle: 'Please sign in to continue',
  },
  review: {
    heading: 'Review Your Request',
    subtitle: 'Please review your information',
  },
  payment: {
    heading: 'Payment',
    subtitle: 'Complete your payment',
    price: '$49.00',
    includes: ['Doctor review', 'Referral sent'],
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
    payment: 'Payment failed. Please try again.',
  },
  turnaround: 'Typical turnaround: 24-48 hours',
  doctorReview: 'Your request will be reviewed by a doctor',
}
