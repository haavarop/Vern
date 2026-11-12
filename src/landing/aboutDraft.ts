import { parseAboutYou, type AboutYou } from '../journey/types.ts'

/** In-progress «Om deg» answers, kept in sessionStorage so a refresh keeps them. */
const KEY = 'vern.aboutYouDraft'

function session(): Storage | undefined {
  try {
    return globalThis.sessionStorage
  } catch {
    return undefined
  }
}

export function loadAboutDraft(storage: Pick<Storage, 'getItem'> | undefined = session()): AboutYou | null {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return null
    return parseAboutYou(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveAboutDraft(about: AboutYou, storage: Pick<Storage, 'setItem'> | undefined = session()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(about))
  } catch {
    // Storage full or unavailable: the draft is a convenience only.
  }
}

export function clearAboutDraft(storage: Pick<Storage, 'removeItem'> | undefined = session()): void {
  try {
    storage?.removeItem(KEY)
  } catch {
    // Ignore unavailable storage.
  }
}
