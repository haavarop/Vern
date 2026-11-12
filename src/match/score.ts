import type { ConnectionState } from '../onboarding/types.ts'
import { DIMENSION_ORDER, type Dimension } from '../profile/types.ts'
import type { InsurerMatch } from './types.ts'

/** Norwegian percent format with a non-breaking space, e.g. "87 %". */
export function formatScore(score: number): string {
  return `${score}\u00a0%`
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Veldig god match'
  if (score >= 65) return 'God match'
  if (score >= 50) return 'Grei match'
  return 'Svakere match'
}

export function isStrictlyHigherMatch(currentScore: number | undefined, suggestedScore: number | undefined): boolean {
  return currentScore !== undefined && suggestedScore !== undefined && suggestedScore > currentScore
}

const BEST: Record<Dimension, string> = {
  pris: 'Lavest pris',
  dekning: 'Bredest dekning',
  hjelp: 'Best på rask hjelp',
  enkelhet: 'Enklest å bruke',
}

const GOOD: Record<Dimension, string> = {
  pris: 'Gunstig pris',
  dekning: 'God dekning',
  hjelp: 'God på rask hjelp',
  enkelhet: 'Enkel å bruke',
}

/**
 * One short reason line per match, e.g. "Bredest dekning". Picks the dimension where the insurer
 * ranks highest among all matches; ties go to a dimension not already used by a higher-ranked match.
 */
export function highlightLines(top: InsurerMatch[], all: InsurerMatch[] = top): string[] {
  const used = new Set<Dimension>()
  return top.map((match) => {
    const ranked = DIMENSION_ORDER.map((d) => ({
      d,
      rank: all.filter((other) => other.dimensions[d] > match.dimensions[d]).length,
    })).sort((a, b) => a.rank - b.rank || Number(used.has(a.d)) - Number(used.has(b.d)) || match.dimensions[b.d] - match.dimensions[a.d])
    const { d, rank } = ranked[0]
    used.add(d)
    return rank === 0 ? BEST[d] : GOOD[d]
  })
}

// Everyday words for products whose name doesn't shorten cleanly.
const TOPICS: Record<string, string> = {
  'Hundeforsikring': 'hund',
  'Katteforsikring': 'katt',
  'Personforsikring (ulykke)': 'personforsikring',
  'Kritisk sykdom': 'sykdom',
  'Behandlingsforsikring': 'behandling',
}

function topic(product: string): string {
  if (TOPICS[product]) return TOPICS[product]
  const base = product.replace(/\s*\(.*\)\s*$/, '').trim()
  const short = base.replace(/forsikring$/i, '')
  const word = short || base
  return word === word.toUpperCase() ? word : word.toLowerCase()
}

/** "innbo og reise" from the user's connected policies, or null when there are none. Pension and savings are left out. */
export function coverageTopics(connections: ConnectionState, max = 3): string | null {
  const policies = Object.values(connections).flat().filter((policy) => policy.category !== 'pensjon')
  const topics = [...new Set(policies.map((policy) => topic(policy.product)))]
  if (topics.length === 0) return null
  const shown = topics.length > max ? [...topics.slice(0, max), `${topics.length - max} til`] : topics
  return new Intl.ListFormat('nb', { type: 'conjunction' }).format(shown)
}
