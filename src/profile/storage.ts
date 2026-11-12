import type { ConnectionState } from '../onboarding/types.ts'
import { isAnswered, rankDimensions, scoreProfile, type Answers, type Dimension } from './types.ts'

/**
 * Shape of data/profile.json. An empty object ({}) or missing file means a new customer,
 * who has to go through onboarding first.
 */
export type StoredProfile = {
  version: 1
  /** ISO timestamp of the last save. */
  updatedAt: string
  /** Onboarding has been completed (or skipped) at least once. */
  onboarded: boolean
  /** Null if the value-profile questions were skipped. */
  valueProfile: {
    answers: Answers
    /** 0–100 per dimension. Stored for comparison with other insurers. */
    scores: Record<Dimension, number>
    /** Dimensions ordered most → least important. */
    ranked: Dimension[]
  } | null
  /** Fetched insurances keyed by insurer id. */
  insurances: ConnectionState
}

export function isNewCustomer(stored: Partial<StoredProfile>): boolean {
  return !stored.onboarded
}

export function buildStoredProfile(answers: Answers | null, insurances: ConnectionState): StoredProfile {
  const valueProfile = isAnswered(answers)
    ? (() => {
        const scores = scoreProfile(answers)
        return { answers, scores, ranked: rankDimensions(scores) }
      })()
    : null
  return { version: 1, updatedAt: new Date().toISOString(), onboarded: true, valueProfile, insurances }
}

// In dev the web server is often ready before the API, so network errors and 5xx (Vite proxy errors) are retried.
// Treating them as "new customer" would send returning users into onboarding.
export async function fetchProfile(
  { attempts = 6, delayMs = 500, fetcher = fetch }: { attempts?: number; delayMs?: number; fetcher?: typeof fetch } = {},
): Promise<Partial<StoredProfile>> {
  for (let attempt = 1; ; attempt++) {
    let response: Response | undefined
    try {
      response = await fetcher('/api/profile')
    } catch (error) {
      if (attempt >= attempts) throw error
    }
    if (response?.ok) return await response.json() as Partial<StoredProfile>
    if (response && (response.status < 500 || attempt >= attempts)) throw new Error('Vi fikk ikke hentet profilen din. Prøv igjen om litt.')
    await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
  }
}

export async function saveProfile(profile: StoredProfile): Promise<void> {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!response.ok) throw new Error('Vi fikk ikke lagret profilen din. Prøv igjen om litt.')
}

export async function deleteProfile(): Promise<void> {
  const response = await fetch('/api/profile', { method: 'DELETE' })
  if (!response.ok) throw new Error('Vi fikk ikke slettet profilen din. Prøv igjen om litt.')
}
