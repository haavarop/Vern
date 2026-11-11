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

export async function fetchProfile(): Promise<Partial<StoredProfile>> {
  const response = await fetch('/api/profile')
  if (!response.ok) throw new Error('Kunne ikke hente profilen.')
  return response.json()
}

export async function saveProfile(profile: StoredProfile): Promise<void> {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!response.ok) throw new Error('Kunne ikke lagre profilen.')
}

export async function deleteProfile(): Promise<void> {
  const response = await fetch('/api/profile', { method: 'DELETE' })
  if (!response.ok) throw new Error('Kunne ikke slette profilen.')
}
