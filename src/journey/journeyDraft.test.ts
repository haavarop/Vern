import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadJourneyDraft, parseCallbacks, saveJourneyDraft } from './journeyDraft.ts'

function memory(): Storage {
  const data = new Map<string, string>()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) } as Storage
}

test('journey draft round-trips and clears', () => {
  const storage = memory()
  saveJourneyDraft('ny', storage)
  assert.equal(loadJourneyDraft(storage), 'ny')
  saveJourneyDraft(null, storage)
  assert.equal(loadJourneyDraft(storage), null)
})

test('journey draft ignores unknown values', () => {
  const storage = memory()
  storage.setItem('vern.journeyDraft', 'noe annet')
  assert.equal(loadJourneyDraft(storage), null)
})

test('parseCallbacks keeps only valid requests', () => {
  const valid = { insurerId: 'if', phone: '91234567', requestedAt: '2026-11-12T10:00:00.000Z' }
  assert.deepEqual(parseCallbacks([valid, { ...valid, phone: '123' }, null, 'x']), [valid])
  assert.deepEqual(parseCallbacks(undefined), [])
})
