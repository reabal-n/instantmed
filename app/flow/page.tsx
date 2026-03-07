import type { Metadata } from "next"
import { FlowOrchestrator } from "@/components/flow/flow-orchestrator"
import { getFlowConfig } from "@/lib/flow/configs"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Medical certificates, repeat prescriptions, and doctor consultations online. Reviewed by Australian-registered doctors.",
}

export default async function FlowPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>
}) {
  const params = await searchParams
  const serviceSlug = params.service ?? undefined

  return (
    <main className="min-h-[80vh] flex flex-col items-center justify-start pt-8 pb-16">
      <FlowOrchestrator
        initialService={serviceSlug}
        configLoader={getFlowConfig}
      />
    </main>
  )
}
