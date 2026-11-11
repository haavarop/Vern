import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState, reducer, stageFor, type Event, type State } from './bankidMachine.ts'

const run = (events: Event[], state: State = initialState()) => events.reduce(reducer, state)
const NNIN: Event[] = [{ type: 'SET_NNIN', value: '010101 12345' }, { type: 'SUBMIT_NNIN' }]

test('happy path via app confirmation', () => {
  let state = run(NNIN)
  assert.deepEqual(state, { step: 'chooseMethod', nnin: '01010112345' })
  state = reducer(state, { type: 'CHOOSE_METHOD', method: 'app', reference: 'BLÅ ELG 42' })
  assert.equal(state.step, 'appWaiting')
  state = run([{ type: 'APP_CONFIRMED' }, { type: 'ACCEPT_CONSENT' }], state)
  assert.equal(state.step, 'fetching')
  state = run([{ type: 'FETCH_PROGRESS', progress: 100 }, { type: 'FETCH_DONE', policies: [] }], state)
  assert.deepEqual(state, { step: 'done', policies: [] })
})

test('nnin must have 11 digits', () => {
  const state = run([{ type: 'SET_NNIN', value: '0101011234' }, { type: 'SUBMIT_NNIN' }])
  assert.equal(state.step, 'identify')
  assert.ok(state.step === 'identify' && state.error)
})

test('code entry: valid code reaches consent, 000000 three times fails', () => {
  const codeEntry = run([...NNIN, { type: 'CHOOSE_METHOD', method: 'code' }])
  assert.equal(codeEntry.step, 'codeEntry')
  assert.equal(run([{ type: 'SET_CODE', value: '123456' }, { type: 'SUBMIT_CODE' }], codeEntry).step, 'consent')

  const wrong: Event[] = [{ type: 'SET_CODE', value: '000000' }, { type: 'SUBMIT_CODE' }]
  const twice = run([...wrong, ...wrong], codeEntry)
  assert.ok(twice.step === 'codeEntry' && twice.attempts === 2 && twice.error)
  const thrice = run(wrong, twice)
  assert.ok(thrice.step === 'failed' && thrice.reason === 'tooManyAttempts')
})

test('decline consent and cancel lead to cancelled; retry keeps nnin', () => {
  const consent = run([...NNIN, { type: 'CHOOSE_METHOD', method: 'app' }, { type: 'APP_CONFIRMED' }])
  const declined = reducer(consent, { type: 'DECLINE_CONSENT' })
  assert.ok(declined.step === 'failed' && declined.reason === 'cancelled')
  const cancelled = run([...NNIN, { type: 'CANCEL' }])
  assert.ok(cancelled.step === 'failed' && cancelled.reason === 'cancelled')
  assert.deepEqual(reducer(declined, { type: 'RETRY' }), { step: 'identify', nnin: '01010112345' })
})

test('app timeout and fetch error fail', () => {
  const waiting = run([...NNIN, { type: 'CHOOSE_METHOD', method: 'app' }])
  const timeout = reducer(waiting, { type: 'APP_TIMEOUT' })
  assert.ok(timeout.step === 'failed' && timeout.reason === 'timeout')
  const fetching = run([{ type: 'APP_CONFIRMED' }, { type: 'ACCEPT_CONSENT' }], waiting)
  const error = reducer(fetching, { type: 'FETCH_ERROR' })
  assert.ok(error.step === 'failed' && error.reason === 'fetchError')
})

test('fetch stages follow progress thresholds', () => {
  assert.equal(stageFor(0), 'connecting')
  assert.equal(stageFor(24), 'connecting')
  assert.equal(stageFor(25), 'authorising')
  assert.equal(stageFor(50), 'fetchingPolicies')
  assert.equal(stageFor(85), 'analysing')
  const fetching = run([...NNIN, { type: 'CHOOSE_METHOD', method: 'app' }, { type: 'APP_CONFIRMED' }, { type: 'ACCEPT_CONSENT' }])
  const state = reducer(fetching, { type: 'FETCH_PROGRESS', progress: 140 })
  assert.ok(state.step === 'fetching' && state.progress === 100 && state.stage === 'analysing')
})
