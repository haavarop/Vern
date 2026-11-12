import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { InsurerMatch } from '../match/types.ts'
import { pickCallbackInsurer } from './callback.ts'

const match = (insurerId: string, score: number, isCurrent = false): InsurerMatch =>
  ({ insurerId, score, dimensions: { pris: 50, dekning: 50, hjelp: 50, enkelhet: 50 }, reason: '', isCurrent })

test('pickCallbackInsurer picks the best match', () => {
  assert.equal(pickCallbackInsurer([match('a', 90), match('b', 80)]), 'a')
})

test('pickCallbackInsurer skips the current insurer when there is another one', () => {
  assert.equal(pickCallbackInsurer([match('current', 95, true), match('b', 80), match('c', 85)]), 'c')
})

test('pickCallbackInsurer falls back to the current insurer, and to null without matches', () => {
  assert.equal(pickCallbackInsurer([match('current', 95, true)]), 'current')
  assert.equal(pickCallbackInsurer([]), null)
})
