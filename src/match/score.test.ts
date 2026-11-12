import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Policy } from '../onboarding/types.ts'
import type { InsurerMatch } from './types.ts'
import { coverageTopics, formatScore, highlightLines, scoreLabel } from './score.ts'

test('formatScore uses a non-breaking space before %', () => {
  assert.equal(formatScore(87), '87\u00a0%')
})

test('scoreLabel uses inclusive thresholds', () => {
  assert.equal(scoreLabel(80), 'Veldig god match')
  assert.equal(scoreLabel(79), 'God match')
  assert.equal(scoreLabel(65), 'God match')
  assert.equal(scoreLabel(50), 'Grei match')
  assert.equal(scoreLabel(49), 'Svakere match')
})

const match = (insurerId: string, pris: number, dekning: number, hjelp: number, enkelhet: number): InsurerMatch =>
  ({ insurerId, score: 70, dimensions: { pris, dekning, hjelp, enkelhet }, reason: '', isCurrent: false })

test('highlightLines names the dimension each match is best at, and avoids repeats on ties', () => {
  const a = match('a', 60, 90, 95, 50)
  const b = match('b', 95, 70, 60, 60)
  const c = match('c', 50, 95, 60, 70)
  assert.deepEqual(highlightLines([a, b, c]), ['Best på rask hjelp', 'Lavest pris', 'Bredest dekning'])
  const d = match('d', 90, 90, 10, 10)
  const e = match('e', 90, 90, 10, 10)
  assert.deepEqual(highlightLines([d, e]), ['Lavest pris', 'Bredest dekning'])
  assert.deepEqual(highlightLines([match('f', 10, 10, 10, 80)], [a, b, match('f', 10, 10, 10, 80)]), ['Enklest å bruke'])
  assert.deepEqual(highlightLines([match('h', 70, 10, 10, 10)], [a, b, c]), ['Gunstig pris'])
  assert.deepEqual(highlightLines([match('g', 10, 10, 10, 40)], [a, b, c]), ['Enkel å bruke'])
})

test('coverageTopics turns product names into a short everyday list', () => {
  const policy = (product: string, category = 'skade') => ({ product, category }) as Policy
  assert.equal(coverageTopics({}), null)
  assert.equal(coverageTopics({ x: [policy('IPS', 'pensjon'), policy('Innskuddspensjon (EPK)', 'pensjon')] }), null)
  assert.equal(coverageTopics({ if: [policy('Innboforsikring')], tryg: [policy('Reiseforsikring (helårs)'), policy('Innboforsikring')] }), 'innbo og reise')
  assert.equal(coverageTopics({ x: [policy('Bilforsikring'), policy('IPS', 'pensjon'), policy('Kritisk sykdom', 'liv'), policy('Husforsikring'), policy('Båtforsikring'), policy('Reiseforsikring (helårs)', 'reise')] }), 'bil, sykdom, hus og 2 til')
  assert.equal(coverageTopics({ x: [policy('Hundeforsikring'), policy('Personforsikring (ulykke)')] }), 'hund og personforsikring')
})
