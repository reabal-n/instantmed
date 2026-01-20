'use client'

import { useState } from 'react'
import { Link2, Linkedin, Twitter, Facebook, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SocialShareProps {
  url: string
  title: string
  description?: string
}

export function SocialShare({ url, title, description }: SocialShareProps) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const encodedDescription = encodeURIComponent(description || '')

  const shareLinks = [
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:text-[#0A66C2]',
    },
    {
      name: 'Twitter',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:text-[#1DA1F2]',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:text-[#1877F2]',
    },
  ]

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">Share:</span>
      
      {shareLinks.map((link) => (
        <a
          key={link.name}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors',
            link.color
          )}
          title={`Share on ${link.name}`}
        >
          <link.icon className="w-4 h-4" />
        </a>
      ))}
      
      <button
        onClick={copyToClipboard}
        className={cn(
          'p-2 rounded-full bg-slate-100 dark:bg-slate-800 transition-colors',
          copied 
            ? 'text-emerald-600 dark:text-emerald-400' 
            : 'text-slate-600 dark:text-slate-400 hover:text-primary'
        )}
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
