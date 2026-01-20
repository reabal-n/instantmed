/**
 * Blog article images sourced from Unsplash
 * Using direct Unsplash URLs for authentic, high-quality stock photography
 * 
 * Image format: https://images.unsplash.com/photo-{ID}?w=800&h=450&fit=crop&q=80
 */

// Medical Certificates Category
export const blogImages = {
  // Medical Certificates
  mentalHealthDay: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=450&fit=crop&q=80',
  foodPoisoning: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&h=450&fit=crop&q=80',
  periodPain: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=450&fit=crop&q=80',
  centrelink: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop&q=80',
  carersLeave: 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&h=450&fit=crop&q=80',
  surgeryRecovery: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=450&fit=crop&q=80',
  pregnancy: 'https://images.unsplash.com/photo-1493894473891-10fc1e5dbd22?w=800&h=450&fit=crop&q=80',
  certificateDuration: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=450&fit=crop&q=80',

  // Conditions
  hayFever: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&h=450&fit=crop&q=80',
  conjunctivitis: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&h=450&fit=crop&q=80',
  uti: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=450&fit=crop&q=80',
  backPain: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=450&fit=crop&q=80',
  insomnia: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&h=450&fit=crop&q=80',
  eczema: 'https://images.unsplash.com/photo-1612776572997-76cc42e058c3?w=800&h=450&fit=crop&q=80',
  reflux: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800&h=450&fit=crop&q=80',
  coldVsFlu: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&h=450&fit=crop&q=80',

  // Telehealth
  whatIsTelehealth: 'https://images.unsplash.com/photo-1609904603780-da3a0c2f3b12?w=800&h=450&fit=crop&q=80',
  telehealthVsInPerson: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=450&fit=crop&q=80',
  prepareForTelehealth: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop&q=80',
  telehealthPrivacy: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=450&fit=crop&q=80',
  telehealthAfterHours: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=450&fit=crop&q=80',
  followUpCare: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&h=450&fit=crop&q=80',

  // Medications
  repeatPrescriptions: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800&h=450&fit=crop&q=80',
  medicationsNotOnline: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&h=450&fit=crop&q=80',
  eScripts: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=450&fit=crop&q=80',
  travelMedications: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=450&fit=crop&q=80',
  antibioticsGuide: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=450&fit=crop&q=80',
  medicationSideEffects: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=450&fit=crop&q=80',

  // Workplace & Study
  sickLeaveRights: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=450&fit=crop&q=80',
  workFromHomeSick: 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=800&h=450&fit=crop&q=80',
  universityMedCert: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=450&fit=crop&q=80',
  returnToWork: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=450&fit=crop&q=80',

  // Fallback/Generic
  genericHealth: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=450&fit=crop&q=80',
  genericDoctor: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=450&fit=crop&q=80',
  genericMedical: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=450&fit=crop&q=80',
} as const

export type BlogImageKey = keyof typeof blogImages
