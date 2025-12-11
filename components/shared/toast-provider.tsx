"use client"

import { Toaster } from "sonner"

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: "rounded-xl shadow-lg",
        duration: 4000,
      }}
    />
  )
}
