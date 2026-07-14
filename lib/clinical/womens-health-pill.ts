export const PILL_CONTRACEPTION_TYPE_VALUES = ["start", "switch"] as const
export const PILL_CURRENT_CONTRACEPTION_VALUES = ["pill", "iud", "other", "none"] as const
export const PILL_PREGNANCY_STATUS_VALUES = ["no", "not_sure", "yes"] as const
export const PILL_YES_NO_VALUES = ["no", "yes"] as const

export const PILL_PREGNANCY_DECLINE_TITLE = "This service is not suitable during pregnancy"
export const PILL_PREGNANCY_DECLINE_REASON = "The contraceptive pill is not started during pregnancy. Please speak with your GP or obstetrician about the right care for you."

export function isExactStringValue<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
): value is TValues[number] {
  return typeof value === "string" && values.includes(value)
}

export function exactStringValue<const TValues extends readonly string[]>(
  value: unknown,
  values: TValues,
): TValues[number] | undefined {
  return isExactStringValue(value, values) ? value : undefined
}
