import type { Policy } from './types.ts'

export type Method = 'app' | 'code'
export type FetchStage = 'connecting' | 'authorising' | 'fetchingPolicies' | 'analysing'
export type FailureReason = 'cancelled' | 'timeout' | 'tooManyAttempts' | 'fetchError'

export type State =
  | { step: 'identify'; nnin: string; error?: string }
  | { step: 'chooseMethod'; nnin: string }
  | { step: 'appWaiting'; nnin: string; reference: string }
  | { step: 'codeEntry'; nnin: string; code: string; attempts: number; error?: string }
  | { step: 'consent'; nnin: string }
  | { step: 'fetching'; nnin: string; progress: number; stage: FetchStage }
  | { step: 'done'; policies: Policy[] }
  | { step: 'failed'; nnin: string; reason: FailureReason; message: string }

export type Event =
  | { type: 'SET_NNIN'; value: string }
  | { type: 'SUBMIT_NNIN' }
  | { type: 'CHOOSE_METHOD'; method: Method; reference?: string }
  | { type: 'APP_CONFIRMED' }
  | { type: 'APP_TIMEOUT' }
  | { type: 'SET_CODE'; value: string }
  | { type: 'SUBMIT_CODE' }
  | { type: 'ACCEPT_CONSENT' }
  | { type: 'DECLINE_CONSENT' }
  | { type: 'FETCH_PROGRESS'; progress: number }
  | { type: 'FETCH_DONE'; policies: Policy[] }
  | { type: 'FETCH_ERROR' }
  | { type: 'CANCEL' }
  | { type: 'RETRY' }

export const MAX_CODE_ATTEMPTS = 3
export const TEST_NNIN = '01010112345'

const FAILURE_MESSAGES: Record<FailureReason, string> = {
  cancelled: 'Innloggingen ble avbrutt.',
  timeout: 'Tiden gikk ut før innloggingen ble bekreftet.',
  tooManyAttempts: 'For mange feil forsøk med engangskode.',
  fetchError: 'Vi fikk ikke hentet forsikringene fra selskapet.',
}

export const initialState = (nnin = ''): State => ({ step: 'identify', nnin })

export function stageFor(progress: number): FetchStage {
  if (progress < 25) return 'connecting'
  if (progress < 50) return 'authorising'
  if (progress < 85) return 'fetchingPolicies'
  return 'analysing'
}

export function maskNnin(nnin: string): string {
  return `${nnin.slice(0, 6)} *****`
}

const digits = (value: string, max: number) => value.replace(/\D/g, '').slice(0, max)

function fail(nnin: string, reason: FailureReason): State {
  return { step: 'failed', nnin, reason, message: FAILURE_MESSAGES[reason] }
}

export function reducer(state: State, event: Event): State {
  if (event.type === 'CANCEL') {
    return state.step === 'done' || state.step === 'failed' ? state : fail(state.nnin, 'cancelled')
  }

  switch (state.step) {
    case 'identify':
      if (event.type === 'SET_NNIN') return { step: 'identify', nnin: digits(event.value, 11) }
      if (event.type === 'SUBMIT_NNIN') {
        return state.nnin.length === 11
          ? { step: 'chooseMethod', nnin: state.nnin }
          : { ...state, error: 'Fødselsnummeret må ha 11 siffer' }
      }
      return state
    case 'chooseMethod':
      if (event.type !== 'CHOOSE_METHOD') return state
      return event.method === 'app'
        ? { step: 'appWaiting', nnin: state.nnin, reference: event.reference ?? '' }
        : { step: 'codeEntry', nnin: state.nnin, code: '', attempts: 0 }
    case 'appWaiting':
      if (event.type === 'APP_CONFIRMED') return { step: 'consent', nnin: state.nnin }
      if (event.type === 'APP_TIMEOUT') return fail(state.nnin, 'timeout')
      return state
    case 'codeEntry': {
      if (event.type === 'SET_CODE') return { ...state, code: digits(event.value, 6), error: undefined }
      if (event.type !== 'SUBMIT_CODE') return state
      if (state.code.length === 6 && state.code !== '000000') return { step: 'consent', nnin: state.nnin }
      const attempts = state.attempts + 1
      if (attempts >= MAX_CODE_ATTEMPTS) return fail(state.nnin, 'tooManyAttempts')
      const error = state.code.length === 6 ? 'Feil kode. Prøv igjen.' : 'Koden må ha 6 siffer'
      return { ...state, code: '', attempts, error: `${error} (${MAX_CODE_ATTEMPTS - attempts} forsøk igjen)` }
    }
    case 'consent':
      if (event.type === 'ACCEPT_CONSENT') return { step: 'fetching', nnin: state.nnin, progress: 0, stage: 'connecting' }
      if (event.type === 'DECLINE_CONSENT') return fail(state.nnin, 'cancelled')
      return state
    case 'fetching':
      if (event.type === 'FETCH_PROGRESS') {
        const progress = Math.max(state.progress, Math.min(100, event.progress))
        return { ...state, progress, stage: stageFor(progress) }
      }
      if (event.type === 'FETCH_DONE') return { step: 'done', policies: event.policies }
      if (event.type === 'FETCH_ERROR') return fail(state.nnin, 'fetchError')
      return state
    case 'failed':
      return event.type === 'RETRY' ? initialState(state.nnin) : state
    case 'done':
      return state
  }
}
