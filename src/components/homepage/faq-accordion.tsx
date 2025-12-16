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
    category: 'Trust',
    question: 'Is this actually legit?',
    answer: 'Yes. Every request is reviewed by a real Australian doctor — registered with AHPRA and actively practicing. This isn\'t AI or a chatbot. It\'s telehealth, which has been legal and regulated in Australia for years.',
  },
  {
    id: 2,
    category: 'Certificates',
    question: 'Will my employer accept an online medical certificate?',
    answer: 'Yes. Our certificates are legally valid and accepted by all Australian employers, unis, and government bodies. They\'re identical to what you\'d get from an in-person GP visit.',
  },
  {
    id: 3,
    category: 'Process',
    question: 'What if the doctor says no?',
    answer: 'If a doctor can\'t approve your request for clinical reasons, you get a full refund. We won\'t charge you for something we can\'t help with.',
  },
  {
    id: 4,
    category: 'Timing',
    question: 'How fast is it really?',
    answer: 'Most requests are done within an hour. Sometimes it\'s 20 minutes, sometimes 90 — depends on how busy we are. You\'ll get email updates so you\'re not left wondering.',
  },
  {
    id: 5,
    category: 'Privacy',
    question: 'Is my information private?',
    answer: 'Completely. Your health info is encrypted and only seen by the treating doctor. We don\'t share anything with employers, insurers, or anyone else. Ever.',
  },
  {
    id: 6,
    category: 'Prescriptions',
    question: 'What medications can you prescribe?',
    answer: 'Most common ones — contraception, blood pressure meds, cholesterol, skin treatments, and more. We can\'t do anything controlled (like strong painkillers) or medications that need a physical exam first.',
  },
  {
    id: 7,
    category: 'Process',
    question: 'Do I need to create an account?',
    answer: 'No. You can go through the whole process as a guest. We\'ll just need an email to send your documents to.',
  },
  {
    id: 8,
    category: 'Support',
    question: 'What if I have questions during the process?',
    answer: 'The doctor might message you if they need more info. You can reply right there. If something\'s unclear on your end, our support team is around to help.',
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
