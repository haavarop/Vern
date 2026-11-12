import { QUESTIONS } from '../profile/types.ts'
import type { PersonaPass, ValueProfileSuggestion } from './pass.ts'

const FALLBACK_ERROR = 'Vern klarte ikke å lese DigiU-profilen akkurat nå. Prøv igjen, eller svar på spørsmålene selv.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function isSuggestion(value: unknown): value is ValueProfileSuggestion {
  if (!isRecord(value) || !isRecord(value.answers) || !isRecord(value.reasons)) return false
  const { answers, reasons } = value
  return QUESTIONS.every((question) => {
    const answer = answers[question.id]
    const reason = reasons[question.id]
    return (answer === null || (typeof answer === 'number' && Number.isInteger(answer) && answer >= 0 && answer < question.options.length)) &&
      (reason === undefined || typeof reason === 'string')
  })
}

/** Asks Vern's API to suggest value-profile answers from the traits in a Persona Pass. */
export async function fetchValueProfileSuggestion(pass: PersonaPass, signal?: AbortSignal): Promise<ValueProfileSuggestion> {
  const response = await fetch('/api/persona/value-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pass),
    signal,
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error(isRecord(data) && typeof data.error === 'string' ? data.error : FALLBACK_ERROR)
  if (!isSuggestion(data)) throw new Error(FALLBACK_ERROR)
  return data
}
