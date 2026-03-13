"use client"

import dynamic from "next/dynamic"

export const MeshGradientCanvas = dynamic(
  () =>
    import("./mesh-gradient-canvas").then((m) => ({
      default: m.MeshGradientCanvas,
    })),
  { ssr: false }
)
