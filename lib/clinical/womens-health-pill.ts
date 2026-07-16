export const PILL_CONTRACEPTION_TYPE_VALUES = ["start", "switch"] as const
export const PILL_CURRENT_CONTRACEPTION_VALUES = ["pill", "iud", "other", "none"] as const
export const PILL_PREGNANCY_STATUS_VALUES = ["no", "not_sure", "yes"] as const
export const PILL_YES_NO_VALUES = ["no", "yes"] as const

export const PILL_PREGNANCY_DECLINE_TITLE = "This service is not suitable during pregnancy"
export const PILL_PREGNANCY_DECLINE_REASON = "The contraceptive pill is not started during pregnancy. Please speak with your GP or obstetrician about the right care for you."
export const PILL_PATHWAY_REDIRECT_TITLE = "This paid pathway cannot continue"
export const PILL_POSSIBLE_PREGNANCY_REDIRECT_REASON = "Pregnancy needs to be ruled out before starting or switching the pill. Please take a pregnancy test or speak with a GP or sexual health clinic."
export const PILL_MIGRAINE_AURA_REDIRECT_REASON = "Some contraceptive pills may be unsafe if you have migraines with aura. Please speak with a GP or sexual health clinic."
export const PILL_BLOOD_CLOT_REDIRECT_REASON = "Some contraceptive pills may be unsafe if you or a close family member have had a blood clot. Please speak with a GP or sexual health clinic."
export const PILL_SMOKING_REDIRECT_REASON = "Smoking changes which contraceptive pills may be safe, especially from age 35. Please speak with a GP or sexual health clinic."

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
