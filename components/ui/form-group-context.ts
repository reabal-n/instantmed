import { createContext, useContext } from "react"

// Keep Input's accessible description independent of FormSection's motion UI.
export const FormGroupContext = createContext<string | undefined>(undefined)

export function useFormGroupDescribedBy() {
  return useContext(FormGroupContext)
}
