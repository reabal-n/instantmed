'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Stethoscope, 
  ArrowLeft, 
  Mail, 
  MessageCircle, 
  Clock, 
  Phone,
  HelpCircle,
  FileText,
  AlertCircle,
  CheckCircle2,
  Send
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const FAQ_ITEMS = [
  {
    question: 'How long does it take to get my certificate?',
    answer: 'Most requests are processed within 2 hours during business hours (8am-10pm AEST). Priority reviews are completed within 30 minutes.',
  },
  {
    question: 'Can I get a backdated certificate?',
    answer: 'Yes, we can backdate certificates up to 7 days with an additional clinical review fee of $10. Backdated requests require additional medical justification.',
  },
  {
    question: 'Will my employer accept this certificate?',
    answer: 'Yes, our medical certificates are issued by AHPRA-registered doctors and are legally valid for all Australian employers, universities, and institutions.',
  },
  {
    question: 'Can you prescribe any medication?',
    answer: 'We can prescribe most PBS-eligible medications, but we cannot prescribe Schedule 8 controlled substances (opioids, benzodiazepines, etc.) via telehealth.',
  },
]

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
    toast.success('Message sent! We\'ll get back to you soon.')
  }

  return (
    <div className="min-h-screen bg-warm">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">InstantMed</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-teal-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              How can we help?
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Got a question or need support? We&apos;re here to help. Check our FAQs below or send us a message.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="grid md:grid-cols-3 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Email Us</h3>
                <p className="text-sm text-slate-500 mb-3">For general enquiries</p>
                <a href="mailto:support@instantmed.com.au" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
                  support@instantmed.com.au
                </a>
              </div>

              <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Support Hours</h3>
                <p className="text-sm text-slate-500 mb-3">When we&apos;re available</p>
                <p className="text-slate-700 text-sm font-medium">
                  8am - 10pm AEST<br />7 days a week
                </p>
              </div>

              <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Urgent Issues</h3>
                <p className="text-sm text-slate-500 mb-3">For medical emergencies</p>
                <p className="text-red-600 text-sm font-semibold">Call 000</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {FAQ_ITEMS.map((item, index) => (
                  <div key={index} className="bg-white rounded-xl border-2 border-slate-100 p-5">
                    <h3 className="font-semibold text-slate-900 mb-2 text-sm">{item.question}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.answer}</p>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-6">
                <Link href="/#faq">
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    View all FAQs
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <motion.div
              className="bg-white rounded-2xl border-2 border-slate-100 p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Send us a message</h2>
              <p className="text-slate-500 mb-6">We typically respond within 24 hours</p>

              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Message sent!</h3>
                  <p className="text-slate-500 mb-6">We&apos;ll get back to you as soon as possible.</p>
                  <Button onClick={() => setIsSubmitted(false)} variant="outline">
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700 font-medium">Name</Label>
                      <Input
                        id="name"
                        value={formState.name}
                        onChange={(e) => setFormState(s => ({ ...s, name: e.target.value }))}
                        placeholder="Your name"
                        className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 font-medium">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formState.email}
                        onChange={(e) => setFormState(s => ({ ...s, email: e.target.value }))}
                        placeholder="you@example.com"
                        className="h-12 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-700 font-medium">Subject</Label>
                    <Select
                      value={formState.subject}
                      onValueChange={(value) => setFormState(s => ({ ...s, subject: value }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2 border-slate-100">
                        <SelectValue placeholder="What's this about?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General enquiry</SelectItem>
                        <SelectItem value="request">Question about my request</SelectItem>
                        <SelectItem value="technical">Technical issue</SelectItem>
                        <SelectItem value="billing">Billing question</SelectItem>
                        <SelectItem value="feedback">Feedback or suggestion</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-slate-700 font-medium">Message</Label>
                    <textarea
                      id="message"
                      value={formState.message}
                      onChange={(e) => setFormState(s => ({ ...s, message: e.target.value }))}
                      className="w-full min-h-[150px] p-4 rounded-xl border-2 border-slate-100 bg-white resize-none focus:outline-none focus:ring-0 focus:border-teal-500 transition-colors text-slate-700 placeholder:text-slate-400"
                      placeholder="How can we help you?"
                      required
                    />
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                      <strong>Note:</strong> For questions about a specific request, please include your request ID if you have one.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/20"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Send message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-100 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} InstantMed. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
