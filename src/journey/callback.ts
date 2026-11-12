import type { InsurerMatch } from '../match/types.ts'

/**
 * Which insurer to offer a callback from: the best match, unless that is the customer's
 * current insurer, in which case the best other insurer. Falls back to the current insurer
 * if it is the only one. Null when there are no matches.
 */
export function pickCallbackInsurer(matches: readonly InsurerMatch[]): string | null {
  const sorted = [...matches].sort((a, b) => b.score - a.score)
  return (sorted.find((match) => !match.isCurrent) ?? sorted[0])?.insurerId ?? null
}
