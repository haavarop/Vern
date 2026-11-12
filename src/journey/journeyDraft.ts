import type { CallbackRequest, Journey } from './types.ts'

/** The branch chosen during onboarding, kept in sessionStorage so a refresh mid-flow keeps it. */
const KEY = 'vern.journeyDraft'

function session(): Storage | undefined {
  try {
    return globalThis.sessionStorage
  } catch {
    return undefined
  }
}

export function parseJourney(value: unknown): Journey | null {
  return value === 'sjekk' || value === 'ny' ? value : null
}

export function parseCallbacks(value: unknown): CallbackRequest[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is CallbackRequest => !!item && typeof item === 'object'
    && typeof item.insurerId === 'string' && typeof item.phone === 'string' && /^\d{8}$/.test(item.phone)
    && typeof item.requestedAt === 'string')
}

export function loadJourneyDraft(storage: Pick<Storage, 'getItem'> | undefined = session()): Journey | null {
  try {
    return parseJourney(storage?.getItem(KEY))
  } catch {
    return null
  }
}

export function saveJourneyDraft(journey: Journey | null, storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined = session()): void {
  try {
    if (journey) storage?.setItem(KEY, journey)
    else storage?.removeItem(KEY)
  } catch {
    // Storage full or unavailable: the draft is a convenience only.
  }
}
