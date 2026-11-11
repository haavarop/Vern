import { test } from 'node:test'
import assert from 'node:assert/strict'
import { INSURERS, searchInsurers } from './insurers.ts'

const ids = (query: string) => searchInsurers(query).map((i) => i.id)

test('insurer ids are unique kebab-case and the list is sorted', () => {
  const all = INSURERS.map((i) => i.id)
  assert.equal(new Set(all).size, all.length)
  for (const id of all) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/)
  assert.equal(all.length, 21)
  assert.deepEqual(INSURERS.map((i) => i.name), [...INSURERS.map((i) => i.name)].sort((a, b) => a.localeCompare(b, 'nb')))
})

test('search matches names, aliases and partial words', () => {
  assert.ok(ids('sparebank').includes('fremtind'))
  assert.ok(ids('gjensidig').includes('gjensidige'))
  assert.ok(ids('nordea').includes('nordea-liv'))
  assert.ok(ids('Bulder').includes('frende'))
  assert.deepEqual(ids('zzz-ingen-treff'), [])
})

test('search is case- and diacritic-insensitive', () => {
  assert.ok(ids('EUROPEISKE').includes('europeiske'))
  assert.ok(ids('båt').includes('watercircles'))
  assert.ok(ids('bat').includes('watercircles'))
  assert.ok(ids('storste').includes('gjensidige'))
})
