import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clearAboutDraft, loadAboutDraft, saveAboutDraft } from './aboutDraft.ts'
import { emptyAboutYou } from '../journey/types.ts'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    removeItem: (key: string) => { data.delete(key) },
  }
}

test('about draft round-trips and clears', () => {
  const storage = memoryStorage()
  const about = { age: 31, occupation: 'Lærer', hasChildren: false, interests: ['innbo' as const, 'reise' as const] }
  saveAboutDraft(about, storage)
  assert.deepEqual(loadAboutDraft(storage), about)
  clearAboutDraft(storage)
  assert.equal(loadAboutDraft(storage), null)
})

test('corrupt or invalid about drafts are rejected or sanitised', () => {
  const storage = memoryStorage()
  for (const raw of ['{not json', '[]', '"x"', 'null', '42']) {
    storage.setItem('vern.aboutYouDraft', raw)
    assert.equal(loadAboutDraft(storage), null, raw)
  }
  storage.setItem('vern.aboutYouDraft', JSON.stringify({ age: 7, occupation: 5, hasChildren: 'ja', interests: ['båt'] }))
  assert.deepEqual(loadAboutDraft(storage), emptyAboutYou())
})

test('throwing storage is ignored for about drafts', () => {
  const broken = {
    getItem: () => { throw new Error('denied') },
    setItem: () => { throw new Error('quota') },
    removeItem: () => { throw new Error('denied') },
  }
  assert.equal(loadAboutDraft(broken), null)
  assert.doesNotThrow(() => saveAboutDraft(emptyAboutYou(), broken))
  assert.doesNotThrow(() => clearAboutDraft(broken))
})
