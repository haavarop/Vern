import { DIMENSION_ORDER, scoreProfile, type Dimension, type UserProfile } from '../profile/types.ts'
import type { ConnectionState, Segment } from '../onboarding/types.ts'
import type { InsurerMatch, MatchRequest } from './types.ts'

const FALLBACK_ERROR = 'Vi klarte ikke å hente matchene dine. Prøv igjen.'

export function buildMatchRequest(profile: UserProfile, connections: ConnectionState): MatchRequest {
  const weights = profile.answers
    ? scoreProfile(profile.answers)
    : Object.fromEntries(DIMENSION_ORDER.map((d) => [d, 50])) as Record<Dimension, number>
  const segments = [...new Set(Object.values(connections).flat().map((policy) => policy.category))] as Segment[]
  return { weights, segments, currentInsurerIds: Object.keys(connections) }
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object'

function isMatch(value: unknown): value is InsurerMatch {
  return isRecord(value)
    && typeof value.insurerId === 'string'
    && typeof value.score === 'number'
    && typeof value.reason === 'string'
    && typeof value.isCurrent === 'boolean'
    && isRecord(value.dimensions)
    && DIMENSION_ORDER.every((d) => typeof (value.dimensions as Record<string, unknown>)[d] === 'number')
}

export async function fetchMatches(request: MatchRequest, signal?: AbortSignal): Promise<InsurerMatch[]> {
  const response = await fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(isRecord(data) && typeof data.error === 'string' ? data.error : FALLBACK_ERROR)
  }
  if (!isRecord(data) || !Array.isArray(data.matches) || !data.matches.every(isMatch)) {
    throw new Error(FALLBACK_ERROR)
  }
  return data.matches
}
