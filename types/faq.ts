/**
 * FAQ types shared between lib/ data files and components/ui/faq-list.
 */

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQGroup {
  category?: string
  items: FAQItem[]
}
