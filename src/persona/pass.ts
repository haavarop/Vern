import type { Answers } from '../profile/types.ts'

/**
 * Persona Pass: the traits a customer chose to share from The Digital You. It reaches Vern in a
 * link's URL fragment (#pass=…), which browsers never send to a server, as base64url-encoded JSON.
 * Only what the customer shared is included: no evidence, sources or raw data.
 */
export type PersonaTrait = {
  /** One word, such as Home or Pets. */
  category: string
  /** One sentence to the customer, in English, such as "You have a dog". */
  value: string
  confidence: 'strong' | 'likely'
}

export type PersonaPass = {
  format: 'persona-pass/v1'
  /** The service that issued the pass. */
  issuer: string
  name: string
  /** ISO timestamp. */
  issuedAt: string
  /** Most important first, as the customer ranked them. */
  traits: PersonaTrait[]
}

/** Vern's value-profile answers suggested from a Persona Pass, with the reason for each. */
export type ValueProfileSuggestion = { answers: Answers; reasons: Record<string, string> }

const MAX_TRAITS = 30
const MAX_ENCODED_LENGTH = 20_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null

/** A valid pass with only the known fields, or null. */
export function parsePersonaPass(value: unknown): PersonaPass | null {
  if (!isRecord(value) || value.format !== 'persona-pass/v1') return null
  const issuer = text(value.issuer, 60)
  const name = text(value.name, 60)
  const issuedAt = text(value.issuedAt, 40)
  if (!issuer || !name || !issuedAt || Number.isNaN(Date.parse(issuedAt))) return null
  if (!Array.isArray(value.traits) || value.traits.length === 0 || value.traits.length > MAX_TRAITS) return null
  const traits: PersonaTrait[] = []
  for (const trait of value.traits) {
    if (!isRecord(trait)) return null
    const category = text(trait.category, 40)
    const traitValue = text(trait.value, 200)
    if (!category || !traitValue || (trait.confidence !== 'strong' && trait.confidence !== 'likely')) return null
    traits.push({ category, value: traitValue, confidence: trait.confidence })
  }
  return { format: 'persona-pass/v1', issuer, name, issuedAt, traits }
}

export function encodePersonaPass(pass: PersonaPass): string {
  const bytes = new TextEncoder().encode(JSON.stringify(pass))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Reads the pass from a URL fragment such as "#pass=…", or returns null. */
export function decodePersonaPass(fragment: string): PersonaPass | null {
  const encoded = new URLSearchParams(fragment.replace(/^#/, '')).get('pass')
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
    const json = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
    return parsePersonaPass(JSON.parse(json))
  } catch {
    return null
  }
}
