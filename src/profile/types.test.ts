import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS, emptyAnswers, isAnswered, isComplete, rankDimensions, scoreProfile } from './types.ts'

test('empty answers are not a profile', () => {
  assert.equal(isAnswered(emptyAnswers()), false)
  assert.deepEqual(scoreProfile(emptyAnswers()), { pris: 0, dekning: 0, hjelp: 0, enkelhet: 0 })
})

test('price-focused answers rank pris first', () => {
  const scores = scoreProfile({ viktigst: 0, forventning: null, skade: null, handtere: 2 })
  assert.equal(rankDimensions(scores)[0], 'pris')
  assert.equal(scores.pris, 100)
  assert.equal(scores.dekning, 0)
})

test('help-focused answers rank hjelp first', () => {
  const scores = scoreProfile({ viktigst: 2, forventning: [0, 2], skade: 2 })
  assert.equal(rankDimensions(scores)[0], 'hjelp')
  assert.equal(scores.hjelp, 100)
})

test('multiple choice scores each picked option on its own dimension', () => {
  const both = scoreProfile({ ...emptyAnswers(), forventning: [0, 2] })
  assert.equal(both.hjelp, 100)
  assert.equal(both.enkelhet, 100)
  assert.equal(both.pris, 0)
  assert.equal(both.dekning, 0)
})

test('isComplete needs exactly the requested number of picks', () => {
  const [single, multi] = QUESTIONS
  assert.equal(isComplete(single, 1), true)
  assert.equal(isComplete(single, null), false)
  assert.equal(isComplete(multi, [0]), false)
  assert.equal(isComplete(multi, [0, 1]), true)
})
