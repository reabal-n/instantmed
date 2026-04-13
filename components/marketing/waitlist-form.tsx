'use client'

import { ArrowRight,Bell, CheckCircle2, Loader2 } from 'lucide-react'
import { useActionState, useState } from 'react'

import { joinWaitlist } from '@/app/actions/waitlist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface WaitlistFormProps {
  serviceId: string
}

export function WaitlistForm({ serviceId }: WaitlistFormProps) {
  const [expanded, setExpanded] = useState(false)
  const [state, formAction, isPending] = useActionState(joinWaitlist, null)

  if (state?.success) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium py-2">
        <CheckCircle2 className="h-4 w-4" />
        We&apos;ll let you know!
      </div>
    )
  }

  if (!expanded) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 text-muted-foreground"
        onClick={() => setExpanded(true)}
      >
        <Bell className="h-3 w-3" />
        Notify me
      </Button>
    )
  }

  return (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="serviceId" value={serviceId} />
      <Input
        name="email"
        type="email"
        placeholder="your@email.com"
        required
        className="h-8 text-sm"
        autoFocus
      />
      <Button size="sm" type="submit" disabled={isPending} className="shrink-0 h-8 px-3">
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
      </Button>
    </form>
  )
}
