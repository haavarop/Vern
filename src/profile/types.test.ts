import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyAnswers, isAnswered, rankDimensions, scoreProfile } from './types.ts'

test('empty answers are not a profile', () => {
  assert.equal(isAnswered(emptyAnswers()), false)
  assert.deepEqual(scoreProfile(emptyAnswers()), { pris: 0, dekning: 0, hjelp: 0, enkelhet: 0 })
})

test('price-focused answers rank pris first', () => {
  const scores = scoreProfile({ viktigst: 0, utsagn: 0, skade: null, handtere: 2 })
  assert.equal(rankDimensions(scores)[0], 'pris')
  assert.equal(scores.pris, 100)
  assert.equal(scores.dekning, 0)
})

test('help-focused answers rank hjelp first', () => {
  const scores = scoreProfile({ viktigst: 2, utsagn: 3, skade: 1, handtere: 3 })
  assert.equal(rankDimensions(scores)[0], 'hjelp')
  assert.equal(scores.hjelp, 100)
})
