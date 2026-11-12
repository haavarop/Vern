import { QUESTIONS, emptyAnswers, isComplete, type Answers } from './types.ts'

/** In-progress value-profile answers, kept in sessionStorage so a refresh mid-flow keeps them. */
const KEY = 'vern.valueProfileDraft'

function session(): Storage | undefined {
  try {
    return globalThis.sessionStorage
  } catch {
    return undefined
  }
}

export function loadDraft(storage: Pick<Storage, 'getItem'> | undefined = session()): Answers | null {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const answers = emptyAnswers()
    for (const [id, value] of Object.entries(parsed)) {
      const question = QUESTIONS.find((q) => q.id === id)
      if (!question) return null
      if (value === null) continue
      const picks = Array.isArray(value) ? value : [value]
      const limit = question.pick ?? 1
      const valid = picks.length >= 1 && picks.length <= limit && new Set(picks).size === picks.length &&
        picks.every((pick) => Number.isInteger(pick) && pick >= 0 && pick < question.options.length)
      if (!valid || (Array.isArray(value) && question.pick === undefined)) return null
      answers[id] = value
    }
    return answers
  } catch {
    return null
  }
}

export function saveDraft(answers: Answers, storage: Pick<Storage, 'setItem'> | undefined = session()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(answers))
  } catch {
    // Storage full or unavailable: the draft is a convenience only.
  }
}

export function clearDraft(storage: Pick<Storage, 'removeItem'> | undefined = session()): void {
  try {
    storage?.removeItem(KEY)
  } catch {
    // Ignore unavailable storage.
  }
}

/** URL question number ("1".."N") → 0-based index, or null if invalid. */
export function parseQuestionParam(param: string | undefined): number | null {
  if (!param || !/^[1-9]\d*$/.test(param)) return null
  const n = Number(param)
  return n <= QUESTIONS.length ? n - 1 : null
}

/** 0-based index → URL question number. */
export function questionParam(index: number): string {
  return String(index + 1)
}

/** First question before `step` without an answer, so deep links can't skip ahead. */
export function firstUnansweredBefore(answers: Answers, step: number): number | null {
  for (let i = 0; i < step && i < QUESTIONS.length; i++) {
    if (!isComplete(QUESTIONS[i], answers[QUESTIONS[i].id])) return i
  }
  return null
}
