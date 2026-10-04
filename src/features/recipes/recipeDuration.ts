export const RECIPE_DURATION_MIN = 1
export const RECIPE_DURATION_MAX = 10080

function assertRecipeDuration(value: number, label: string) {
  if (!Number.isInteger(value) || value < RECIPE_DURATION_MIN || value > RECIPE_DURATION_MAX) {
    throw new Error(`${label} musi być pełną liczbą minut od ${RECIPE_DURATION_MIN} do ${RECIPE_DURATION_MAX}.`)
  }
  return value
}

export function parseOptionalRecipeDuration(value: string, label: string) {
  const clean = value.trim()
  if (!clean) return null
  if (!/^\d+$/.test(clean)) {
    throw new Error(`${label} musi być pełną liczbą minut od ${RECIPE_DURATION_MIN} do ${RECIPE_DURATION_MAX}.`)
  }
  return assertRecipeDuration(Number(clean), label)
}

export function readStoredRecipeDuration(value: number | string | null, label: string) {
  if (value === null) return null
  return assertRecipeDuration(Number(value), label)
}

export function formatRecipeDuration(minutes: number) {
  const safeMinutes = assertRecipeDuration(minutes, 'Czas przepisu')
  if (safeMinutes < 60) return `${safeMinutes} min`

  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  if (remainder === 0) return `${hours} godz.`
  return `${hours} godz. ${remainder} min`
}
