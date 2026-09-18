import { createRoot } from "react-dom/client"

import { RequestAccessSignIn } from "@/components/track/request-access-sign-in"

createRoot(document.getElementById("root")!).render(
  <main className="min-h-screen bg-background px-4 py-12 text-foreground">
    <section className="mx-auto max-w-md rounded-2xl border border-border/50 bg-white p-6 dark:bg-card">
      <h1 className="text-2xl font-semibold">Your request is complete</h1>
      <RequestAccessSignIn />
    </section>
  </main>,
)
