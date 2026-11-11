import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS, defaultAnswers, rankDimensions, scoreProfile } from './types.ts'

test('default answers give 50 on every dimension', () => {
  assert.deepEqual(scoreProfile(defaultAnswers()), { pris: 50, dekning: 50, hjelp: 50, enkelhet: 50 })
})

test('price-focused answers rank pris first', () => {
  const answers = defaultAnswers()
  for (const q of QUESTIONS) for (const o of q.options) answers[q.id][o.id] = o.weights.pris ? 4 : 0
  const scores = scoreProfile(answers)
  assert.equal(rankDimensions(scores)[0], 'pris')
  assert.equal(scores.pris, 100)
})
