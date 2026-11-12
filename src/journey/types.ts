/**
 * The customer journey from the landing page:
 * landing → om deg → har du forsikringer i dag? → (sjekk dem | finn ny match) → verdiprofil → … → resultat → bli ringt opp?
 *
 * - 'sjekk': the customer has insurances and wants to see how well they match. Includes the upload step.
 * - 'ny': the customer wants a new match. Skips the upload step.
 */
export type Journey = 'sjekk' | 'ny'

export const INTERESTS = ['hus', 'bil', 'innbo', 'ulykke', 'reise'] as const
export type Interest = (typeof INTERESTS)[number]

export const INTEREST_LABELS: Record<Interest, string> = {
  hus: 'Hus',
  bil: 'Bil',
  innbo: 'Innbo',
  ulykke: 'Ulykke',
  reise: 'Reise',
}

export const MIN_AGE = 16
export const MAX_AGE = 120
export const MAX_OCCUPATION_LENGTH = 100

/** «Om deg». Every field is optional: null (or an empty list) means the customer skipped it. */
export type AboutYou = {
  age: number | null
  occupation: string | null
  hasChildren: boolean | null
  interests: Interest[]
}

export function emptyAboutYou(): AboutYou {
  return { age: null, occupation: null, hasChildren: null, interests: [] }
}

export function isAboutYouFilled(about: AboutYou | null | undefined): about is AboutYou {
  return !!about && (about.age !== null || about.occupation !== null || about.hasChildren !== null || about.interests.length > 0)
}

/** Validates untrusted input (sessionStorage, profile.json). Invalid fields become null instead of failing the whole object. */
export function parseAboutYou(value: unknown): AboutYou | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  const age = typeof raw.age === 'number' && Number.isInteger(raw.age) && raw.age >= MIN_AGE && raw.age <= MAX_AGE ? raw.age : null
  const occupation = typeof raw.occupation === 'string' && raw.occupation.trim()
    ? raw.occupation.trim().slice(0, MAX_OCCUPATION_LENGTH)
    : null
  const hasChildren = typeof raw.hasChildren === 'boolean' ? raw.hasChildren : null
  const interests = Array.isArray(raw.interests)
    ? INTERESTS.filter((interest) => (raw.interests as unknown[]).includes(interest))
    : []
  return { age, occupation, hasChildren, interests }
}

/** A customer asked to be called by an insurer. Demo only: nothing is sent to the insurer. */
export type CallbackRequest = {
  insurerId: string
  /** Norwegian phone number, 8 digits, no spaces or country code. */
  phone: string
  /** ISO timestamp. */
  requestedAt: string
}
