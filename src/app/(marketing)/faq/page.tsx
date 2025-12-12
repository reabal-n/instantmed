import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'Frequently Asked Questions | InstantMed',
  description: 'Find answers to common questions about InstantMed telehealth services.',
}

const faqs = [
  {
    category: 'About the Service',
    questions: [
      {
        q: 'How does InstantMed work?',
        a: 'InstantMed connects you with Australian-registered doctors through an asynchronous telehealth platform. You complete a brief health questionnaire, a doctor reviews your information, and you receive a response within 1 hour. No video calls or appointments required.',
      },
      {
        q: 'Who are the doctors?',
        a: 'All consultations are reviewed by doctors registered with AHPRA (Australian Health Practitioner Regulation Agency). Our doctors are qualified general practitioners with experience in telehealth medicine.',
      },
      {
        q: 'Is this a real medical consultation?',
        a: 'Yes. Every request is individually reviewed by a qualified doctor who makes clinical decisions based on the information you provide. This is a legitimate medical service, not an automated system.',
      },
      {
        q: 'What is the 1-hour guarantee?',
        a: 'We commit to reviewing your request within 60 minutes of payment. If we don\'t meet this timeframe (and you selected standard service), we\'ll refund your consultation fee. Priority requests have a 30-minute target.',
      },
    ],
  },
  {
    category: 'Eligibility & Limitations',
    questions: [
      {
        q: 'Who can use InstantMed?',
        a: 'InstantMed is available to Australian residents aged 18 and over. Some services have additional requirements (e.g., weight management requires a BMI of 30+ or 27+ with related health conditions).',
      },
      {
        q: 'What can\'t you help with?',
        a: 'We cannot help with emergencies, mental health crises, controlled substances (Schedule 8), complex chronic conditions requiring examination, workers\' compensation claims, or conditions requiring physical examination. For emergencies, call 000.',
      },
      {
        q: 'Can you prescribe any medication?',
        a: 'No. Our doctors prescribe based on clinical appropriateness and Australian prescribing guidelines. We cannot prescribe Schedule 8 (controlled) medications, and some medications require in-person assessment.',
      },
      {
        q: 'What if my request is declined?',
        a: 'If our doctor determines that telehealth isn\'t appropriate for your situation, you\'ll receive a full refund. We\'ll also provide guidance on next steps, such as seeing a GP in person.',
      },
    ],
  },
  {
    category: 'Pricing & Payment',
    questions: [
      {
        q: 'How much does it cost?',
        a: 'Prices start from $29 for medical certificates and vary by service. All prices are displayed before you pay. There are no hidden fees or surprise charges.',
      },
      {
        q: 'Can I claim on Medicare?',
        a: 'No. InstantMed is a private telehealth service and does not attract Medicare rebates. You may be able to claim through private health insurance depending on your policy.',
      },
      {
        q: 'What is the Priority option?',
        a: 'Priority service adds $20 to your consultation and guarantees a 30-minute response time (instead of 1 hour). Useful when you need something urgently.',
      },
      {
        q: 'When do you charge my card?',
        a: 'Payment is taken when you submit your consultation request. If your request is declined by our doctor, you receive a full refund within 3-5 business days.',
      },
    ],
  },
  {
    category: 'Prescriptions & Documents',
    questions: [
      {
        q: 'How do I get my prescription?',
        a: 'Approved prescriptions are sent electronically via eScript (a QR code sent to your email and SMS). You can take this to any Australian pharmacy to collect your medication.',
      },
      {
        q: 'Can you send prescriptions to a specific pharmacy?',
        a: 'With eScript, you can present your prescription at any pharmacy of your choice. We don\'t send prescriptions directly to pharmacies.',
      },
      {
        q: 'How do I receive my medical certificate?',
        a: 'Medical certificates are sent as a PDF to your email and are also available to download from your patient dashboard.',
      },
      {
        q: 'Are your documents legitimate?',
        a: 'Yes. All prescriptions and medical certificates are issued by registered doctors and are legally valid throughout Australia.',
      },
    ],
  },
  {
    category: 'Privacy & Security',
    questions: [
      {
        q: 'Is my information secure?',
        a: 'Yes. We use bank-level encryption to protect your data. All information is stored in Australian data centers and we comply with the Privacy Act and Australian Privacy Principles.',
      },
      {
        q: 'Do you share my information?',
        a: 'We never sell your data. Information is only shared when necessary for your care (e.g., with pharmacies processing your prescription) or when required by law.',
      },
      {
        q: 'Can I request my data be deleted?',
        a: 'Yes. You can request data deletion through your account settings. Note that we\'re required to retain medical records for 7 years as per Australian healthcare regulations.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="py-16">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about InstantMed
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-12">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-xl font-semibold mb-4">{section.category}</h2>
              <Accordion type="single" collapsible className="w-full">
                {section.questions.map((faq, index) => (
                  <AccordionItem key={index} value={`${section.category}-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 text-center p-8 bg-muted/50 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-4">
            Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" asChild>
              <a href="mailto:support@instantmed.com.au">Email Support</a>
            </Button>
            <Button asChild>
              <Link href="/start">
                Start Consultation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
