import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isSuggestion } from './api.ts'

test('suggestions accept multiple-choice answers with exactly the picked number of options', () => {
  const reasons = { viktigst: 'Grunn.' }
  assert.ok(isSuggestion({ answers: { viktigst: 2, forventning: [2, 3], skade: 1 }, reasons }))
  assert.ok(isSuggestion({ answers: { viktigst: null, forventning: null, skade: null }, reasons: {} }))
  assert.ok(!isSuggestion({ answers: { viktigst: 2, forventning: 2, skade: 1 }, reasons }))
  assert.ok(!isSuggestion({ answers: { viktigst: 2, forventning: [2], skade: 1 }, reasons }))
  assert.ok(!isSuggestion({ answers: { viktigst: 2, forventning: [2, 2], skade: 1 }, reasons }))
  assert.ok(!isSuggestion({ answers: { viktigst: [2], forventning: [0, 1], skade: 1 }, reasons }))
})
