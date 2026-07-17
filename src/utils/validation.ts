/** Empty input means "no score yet" — store null, never 0. */
export function parseOptionalScore(value: string): number | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : Number(trimmed)
}

export function validateScore(value: string): string | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const parsed = Number(trimmed)
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
    return 'Must be a number between 0 and 100'
  }
  return undefined
}
