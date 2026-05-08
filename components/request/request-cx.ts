"use client"

type RequestClassValue = string | false | null | undefined

export function requestCx(...classes: RequestClassValue[]) {
  return classes.filter(Boolean).join(" ")
}
