import type { Dimension } from '../profile/types.ts'
import type { Segment } from '../onboarding/types.ts'

/**
 * Contract for POST /api/match. Scores are mocked on the server for now and will later
 * come from the AI model, so the client must only depend on these shapes.
 */
export type MatchRequest = {
  /** User's value-profile weights per dimension, 0–100. Equal weights when the profile was skipped. */
  weights: Record<Dimension, number>
  /** Segments the user currently has policies in. Empty when no insurers are connected. */
  segments: Segment[]
  /** Insurer ids the user is currently a customer of. */
  currentInsurerIds: string[]
}

export type InsurerMatch = {
  insurerId: string
  /** Overall match, 0–100, integer. */
  score: number
  /** Per-dimension fit, 0–100, integer. */
  dimensions: Record<Dimension, number>
  /** Short Norwegian explanation of why the score is what it is. */
  reason: string
  isCurrent: boolean
}

export type MatchResponse = {
  /** Sorted by score, best match first. */
  matches: InsurerMatch[]
}
