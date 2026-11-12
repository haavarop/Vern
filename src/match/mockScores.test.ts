import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getInsurer } from '../onboarding/insurers.ts'
import { mockMatches } from './mockScores.ts'
import type { MatchRequest } from './types.ts'

const equal = { pris: 50, dekning: 50, hjelp: 50, enkelhet: 50 }
const request = (overrides: Partial<MatchRequest> = {}): MatchRequest => ({ weights: equal, segments: [], currentInsurerIds: [], ...overrides })

test('sorts matches by score, best first, with integer scores in 0–100', () => {
  const matches = mockMatches(request())
  assert.ok(matches.length > 1)
  for (let i = 1; i < matches.length; i++) assert.ok(matches[i - 1].score >= matches[i].score)
  for (const match of matches) {
    for (const value of [match.score, ...Object.values(match.dimensions)]) {
      assert.ok(Number.isInteger(value) && value >= 0 && value <= 100)
    }
    assert.ok(match.reason.length > 0)
  }
})

test('filters by segment and falls back to skade', () => {
  const skade = mockMatches(request())
  assert.ok(skade.every((m) => getInsurer(m.insurerId)?.segments.includes('skade')))
  const pensjon = mockMatches(request({ segments: ['pensjon'] }))
  assert.ok(pensjon.every((m) => getInsurer(m.insurerId)?.segments.includes('pensjon')))
  assert.ok(!pensjon.some((m) => m.insurerId === 'if'))
})

test('always includes and flags current insurers', () => {
  const matches = mockMatches(request({ segments: ['pensjon'], currentInsurerIds: ['help', 'unknown'] }))
  assert.equal(matches.find((m) => m.insurerId === 'help')?.isCurrent, true)
  assert.ok(!matches.some((m) => m.insurerId === 'unknown'))
  assert.ok(matches.filter((m) => m.insurerId !== 'help').every((m) => !m.isCurrent))
})

test('weights change the ranking and zero weights behave as equal', () => {
  const byPrice = mockMatches(request({ weights: { pris: 100, dekning: 0, hjelp: 0, enkelhet: 0 } }))
  const byCover = mockMatches(request({ weights: { pris: 0, dekning: 100, hjelp: 0, enkelhet: 0 } }))
  assert.notDeepEqual(byPrice.map((m) => m.insurerId), byCover.map((m) => m.insurerId))
  assert.match(byPrice.find((m) => m.insurerId === 'klp')!.reason, /pris og verdi\. Det er det du bryr deg mest om/)
  const zero = mockMatches(request({ weights: { pris: 0, dekning: 0, hjelp: 0, enkelhet: 0 } }))
  assert.deepEqual(zero.map((m) => m.score), mockMatches(request()).map((m) => m.score))
})

test('is deterministic', () => {
  const input = request({ segments: ['skade', 'reise'], currentInsurerIds: ['if'] })
  assert.deepEqual(mockMatches(input), mockMatches(input))
})
