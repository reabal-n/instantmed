import { GuestConfirmationCard } from "@/components/request/guest-confirmation-card"
import { Footer } from "@/components/shared/footer"
import { Navbar } from "@/components/shared/navbar"

export const metadata = {
  title: "No Account Needed",
  description: "You can continue without creating an account",
  robots: { index: false, follow: false },
}

export default function GuestConfirmedPage() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4 pb-20 pt-32">
        <div className="mx-auto w-full max-w-lg">
          <GuestConfirmationCard />
        </div>
      </main>
      <Footer variant="minimal" />
    </>
  )
}
