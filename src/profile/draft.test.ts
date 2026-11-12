import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clearDraft, firstUnansweredBefore, loadDraft, parseQuestionParam, questionParam, saveDraft } from './draft.ts'
import { QUESTIONS, emptyAnswers } from './types.ts'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
    removeItem: (key: string) => { data.delete(key) },
    data,
  }
}

test('draft round-trips and clears', () => {
  const storage = memoryStorage()
  const answers = { ...emptyAnswers(), viktigst: 2, forventning: [0, 3] }
  saveDraft(answers, storage)
  assert.deepEqual(loadDraft(storage), answers)
  clearDraft(storage)
  assert.equal(loadDraft(storage), null)
})

test('partial draft is filled with nulls', () => {
  const storage = memoryStorage()
  storage.setItem('vern.valueProfileDraft', JSON.stringify({ forventning: [1] }))
  assert.deepEqual(loadDraft(storage), { ...emptyAnswers(), forventning: [1] })
})

test('corrupt or invalid drafts are rejected', () => {
  const storage = memoryStorage()
  for (const raw of ['{not json', '[]', '"x"', '{"ukjent":0}', '{"viktigst":4}', '{"viktigst":-1}', '{"viktigst":1.5}', '{"viktigst":"1"}',
    '{"viktigst":[0]}', '{"forventning":[0,1,2]}', '{"forventning":[1,1]}', '{"forventning":[4]}', '{"forventning":[]}']) {
    storage.setItem('vern.valueProfileDraft', raw)
    assert.equal(loadDraft(storage), null, raw)
  }
})

test('throwing storage is ignored', () => {
  const broken = {
    getItem: () => { throw new Error('denied') },
    setItem: () => { throw new Error('quota') },
    removeItem: () => { throw new Error('denied') },
  }
  assert.equal(loadDraft(broken), null)
  assert.doesNotThrow(() => saveDraft(emptyAnswers(), broken))
  assert.doesNotThrow(() => clearDraft(broken))
})

test('question params map to 0-based indexes', () => {
  assert.equal(parseQuestionParam('1'), 0)
  assert.equal(parseQuestionParam(String(QUESTIONS.length)), QUESTIONS.length - 1)
  for (const bad of [undefined, '', '0', '01', '1.5', 'abc', '-1', String(QUESTIONS.length + 1)]) {
    assert.equal(parseQuestionParam(bad), null, String(bad))
  }
  assert.equal(questionParam(0), '1')
})

test('firstUnansweredBefore finds gaps before the step', () => {
  const answers = { ...emptyAnswers(), viktigst: 0, forventning: [0] }
  assert.equal(firstUnansweredBefore(answers, 0), null)
  assert.equal(firstUnansweredBefore(answers, 1), null)
  assert.equal(firstUnansweredBefore(answers, 3), 1)
  assert.equal(firstUnansweredBefore({ ...answers, forventning: [0, 1] }, 3), 2)
})
