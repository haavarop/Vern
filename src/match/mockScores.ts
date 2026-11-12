import { INSURERS } from '../onboarding/insurers.ts'
import { hashString } from '../onboarding/mockPolicies.ts'
import type { Insurer } from '../onboarding/types.ts'
import { DIMENSION_ORDER, DIMENSIONS, type Dimension } from '../profile/types.ts'
import type { InsurerMatch, MatchRequest } from './types.ts'

type Profile = Record<Dimension, number>

const PROFILES: Record<string, Profile> = {
  gjensidige: { pris: 58, dekning: 90, hjelp: 86, enkelhet: 78 },
  if: { pris: 66, dekning: 85, hjelp: 80, enkelhet: 82 },
  tryg: { pris: 70, dekning: 72, hjelp: 58, enkelhet: 64 },
  fremtind: { pris: 80, dekning: 72, hjelp: 64, enkelhet: 90 },
  storebrand: { pris: 62, dekning: 80, hjelp: 74, enkelhet: 66 },
  frende: { pris: 74, dekning: 70, hjelp: 92, enkelhet: 68 },
  eika: { pris: 60, dekning: 50, hjelp: 78, enkelhet: 44 },
  klp: { pris: 92, dekning: 58, hjelp: 62, enkelhet: 40 },
}

function profileFor(insurer: Insurer): Profile {
  const known = PROFILES[insurer.id]
  if (known) return known
  // A per-insurer base level keeps overall scores spread out instead of averaging towards the middle.
  // Kept below the hand-tuned brands above so niche insurers rarely top the list.
  const base = 40 + (hashString(insurer.id) % 26)
  return Object.fromEntries(DIMENSION_ORDER.map((d) => {
    const value = base - 15 + (hashString(`${insurer.id}:${d}`) % 31)
    return [d, Math.min(95, Math.max(35, value))]
  })) as Profile
}

function label(d: Dimension) {
  return DIMENSIONS[d].label.toLowerCase()
}

function reasonFor(dimensions: Profile, weights: Profile, equal: boolean): string {
  const strongest = [...DIMENSION_ORDER].sort((a, b) => dimensions[b] - dimensions[a])[0]
  if (equal) return `Sterkest på ${label(strongest)}.`
  const top = [...DIMENSION_ORDER].sort((a, b) => weights[b] - weights[a])[0]
  if (strongest === top) return `Sterk på ${label(top)}. Det er det du bryr deg mest om.`
  if (dimensions[top] < 60) return `Litt svakere på ${label(top)}, som betyr noe for deg.`
  return `Sterkest på ${label(strongest)}, og god på ${label(top)}.`
}

/**
 * Placeholder for the AI model: scores insurers from a fixed, deterministic per-dimension
 * profile weighted by the user's value profile. Replace with model output later.
 */
export function mockMatches(request: MatchRequest): InsurerMatch[] {
  const segments = request.segments.length > 0 ? request.segments : ['skade']
  const current = new Set(request.currentInsurerIds)
  const total = DIMENSION_ORDER.reduce((sum, d) => sum + request.weights[d], 0)
  const equal = total === 0 || DIMENSION_ORDER.every((d) => request.weights[d] === request.weights.pris)
  const weights = Object.fromEntries(DIMENSION_ORDER.map((d) => [d, total === 0 ? 1 : request.weights[d]])) as Profile
  const weightSum = total === 0 ? DIMENSION_ORDER.length : total

  return INSURERS
    .filter((insurer) => current.has(insurer.id) || insurer.segments.some((s) => segments.includes(s)))
    .map((insurer) => {
      const dimensions = profileFor(insurer)
      const raw = DIMENSION_ORDER.reduce((sum, d) => sum + dimensions[d] * weights[d], 0) / weightSum
      return {
        insurer,
        match: {
          insurerId: insurer.id,
          score: Math.min(100, Math.max(0, Math.round(raw))),
          dimensions: { ...dimensions },
          reason: reasonFor(dimensions, weights, equal),
          isCurrent: current.has(insurer.id),
        },
      }
    })
    .sort((a, b) => b.match.score - a.match.score || a.insurer.name.localeCompare(b.insurer.name, 'nb'))
    .map(({ match }) => match)
}
