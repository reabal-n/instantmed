'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'

interface FAQItem {
  id: number
  question: string
  answer: string
  category?: string
}

const faqs: FAQItem[] = [
  {
    id: 1,
    category: 'General',
    question: 'How does InstantMed work?',
    answer: 'InstantMed connects you with Australian registered doctors through our secure telehealth platform. Simply complete our health questionnaire, pay the consultation fee, and a doctor will review your case. Once approved, your medical certificate or prescription is sent directly to your email.',
  },
  {
    id: 2,
    category: 'General',
    question: 'Are your doctors real Australian doctors?',
    answer: 'Yes! All our doctors are fully registered with AHPRA (Australian Health Practitioner Regulation Agency) and hold valid medical licenses to practice in Australia. You can verify any doctor\'s registration on the AHPRA website.',
  },
  {
    id: 3,
    category: 'Certificates',
    question: 'Will my employer accept an online medical certificate?',
    answer: 'Absolutely. Our medical certificates are legally valid and accepted by all Australian employers, universities, and government bodies. They meet the same standards as certificates issued by in-person GP visits.',
  },
  {
    id: 4,
    category: 'Certificates',
    question: 'Can I get a backdated medical certificate?',
    answer: 'In some cases, yes. Backdated certificates require additional clinical review to ensure medical appropriateness. A $10 review fee applies, and the doctor will assess whether backdating is clinically justified based on your symptoms and circumstances.',
  },
  {
    id: 5,
    category: 'Prescriptions',
    question: 'What medications can you prescribe?',
    answer: 'We can prescribe most PBS-eligible medications that are appropriate for telehealth consultations. This includes common medications for blood pressure, cholesterol, thyroid conditions, contraceptives, and more. We cannot prescribe Schedule 8 (controlled) substances or medications requiring physical examination.',
  },
  {
    id: 6,
    category: 'Prescriptions',
    question: 'How do I get my prescription filled?',
    answer: 'We send your prescription as an eScript token to your nominated email. You can then take this token to any Australian pharmacy, where they\'ll scan it to dispense your medication. It\'s the same system used by regular GP clinics.',
  },
  {
    id: 7,
    category: 'Timing',
    question: 'How long does it take to get my certificate or prescription?',
    answer: 'Standard requests are reviewed within 2 hours during business hours (8am-10pm AEST). Priority review ($9.95) guarantees review within 30 minutes. After approval, your document is sent instantly to your email.',
  },
  {
    id: 8,
    category: 'Privacy',
    question: 'Is my information secure?',
    answer: 'Yes, we take privacy seriously. All data is encrypted using bank-level AES-256 encryption and stored in compliance with Australian Privacy Principles. We never share your health information with employers or third parties without your explicit consent.',
  },
]

interface FAQAccordionProps {
  limit?: number
  showCategories?: boolean
}

export function FAQAccordion({ limit, showCategories = false }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<number | null>(null)
  const displayFaqs = limit ? faqs.slice(0, limit) : faqs

  const toggle = (id: number) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="space-y-3">
      {displayFaqs.map((faq, index) => (
        <motion.div
          key={faq.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div
            className={`rounded-xl border transition-all duration-300 ${
              openId === faq.id
                ? 'bg-white border-teal-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
                : 'bg-white/50 border-slate-100 hover:border-slate-200'
            }`}
          >
            <button
              onClick={() => toggle(faq.id)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <div className="flex items-center gap-3">
                {showCategories && faq.category && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
                    {faq.category}
                  </span>
                )}
                <span className="font-medium text-slate-900 pr-4">{faq.question}</span>
              </div>
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  openId === faq.id
                    ? 'bg-teal-600 text-white rotate-0'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {openId === faq.id ? (
                  <Minus className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {openId === faq.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-0">
                    <div className="pl-0 border-l-2 border-teal-200">
                      <p className="text-slate-600 leading-relaxed pl-4">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Simple inline FAQ item for use elsewhere
export function FAQInline({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left hover:text-teal-600 transition-colors"
      >
        <span className="font-medium text-sm">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-4 h-4" />
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-sm text-muted-foreground pb-4 overflow-hidden"
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
