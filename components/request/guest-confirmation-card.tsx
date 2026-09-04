import { Check } from "lucide-react"
import Link from "next/link"

import { StickerIcon } from "@/components/icons/stickers"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heading } from "@/components/ui/heading"
import { CONTACT_EMAIL } from "@/lib/constants"
import { GUARANTEE } from "@/lib/marketing/voice"

export function GuestConfirmationCard() {
  return (
    <Card className="p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success mb-6">
        <Check aria-hidden="true" className="w-8 h-8 text-white" strokeWidth={2.5} />
      </div>

      <Heading level="h1" className="!text-2xl mb-2">No account needed to finish</Heading>
      <p className="text-muted-foreground mb-6">
        You can close this page. We&apos;ll email you about the request you submitted. Secure sign-in may be needed later to answer a doctor or open clinical documents.
      </p>

      <div className="space-y-4 text-left bg-muted/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <StickerIcon name="email" size={32} className="shrink-0" />
          <div>
            <p className="font-medium">Check your email</p>
            <p className="text-base text-muted-foreground">
              We&apos;ll email you when your request is finished.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <StickerIcon name="clock" size={32} className="shrink-0" />
          <div>
            <p className="font-medium">Typical turnaround</p>
            <p className="text-base text-muted-foreground">
              Requests are accepted any time. Assessment follows when available.
            </p>
          </div>
        </div>
      </div>

      <div className="text-left bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-xl p-4 mb-6">
        <p className="text-base text-muted-foreground">
          <span className="font-medium text-foreground">How does this work?</span>{" "}
          Your request is assessed using the information you provided. If more information is
          needed, we&apos;ll reach out. {GUARANTEE}{" "}
          <a href="/how-we-decide" className="text-primary hover:underline font-medium">
            Learn how we decide on requests →
          </a>
        </p>
      </div>

      <Button asChild className="w-full">
        <Link href="/">Return to home</Link>
      </Button>

      <p className="text-base text-muted-foreground mt-6">
        Questions? Contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </Card>
  )
}
