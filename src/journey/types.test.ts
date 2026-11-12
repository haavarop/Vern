import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_AGE, MAX_OCCUPATION_LENGTH, MIN_AGE, parseAboutYou } from './types.ts'

test('parseAboutYou rejects non-objects', () => {
  for (const value of [null, undefined, 'x', 3, [], true]) assert.equal(parseAboutYou(value), null, String(value))
})

test('parseAboutYou turns invalid ages into null', () => {
  for (const age of [MIN_AGE - 1, MAX_AGE + 1, 30.5, '30', NaN]) assert.equal(parseAboutYou({ age })?.age, null, String(age))
  assert.equal(parseAboutYou({ age: MIN_AGE })?.age, MIN_AGE)
  assert.equal(parseAboutYou({ age: MAX_AGE })?.age, MAX_AGE)
})

test('parseAboutYou trims and caps occupation, blank becomes null', () => {
  assert.equal(parseAboutYou({ occupation: '  Snekker  ' })?.occupation, 'Snekker')
  assert.equal(parseAboutYou({ occupation: '   ' })?.occupation, null)
  assert.equal(parseAboutYou({ occupation: 'a'.repeat(MAX_OCCUPATION_LENGTH + 20) })?.occupation?.length, MAX_OCCUPATION_LENGTH)
})

test('parseAboutYou keeps only known interests and boolean hasChildren', () => {
  const about = parseAboutYou({ hasChildren: 'ja', interests: ['reise', 'båt', 'bil', 7] })
  assert.equal(about?.hasChildren, null)
  assert.deepEqual(about?.interests, ['bil', 'reise'])
  assert.deepEqual(parseAboutYou({ interests: 'bil' })?.interests, [])
  assert.equal(parseAboutYou({ hasChildren: false })?.hasChildren, false)
})
