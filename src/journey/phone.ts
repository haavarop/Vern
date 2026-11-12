/**
 * Norwegian phone numbers: 8 digits, first digit 2–9. Accepts spaces, dots and dashes,
 * and an optional +47 / 0047 country code.
 * Returns the 8 digits, or null if the input is not a valid Norwegian number.
 */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s.-]/g, '')
  const local = compact.replace(/^(?:\+47|0047)/, '')
  return /^[2-9]\d{7}$/.test(local) ? local : null
}

/** "12345678" → "123 45 678". Uses non-breaking spaces so the number never wraps. */
export function formatPhone(digits: string): string {
  return /^\d{8}$/.test(digits) ? `${digits.slice(0, 3)}\u00a0${digits.slice(3, 5)}\u00a0${digits.slice(5)}` : digits
}
