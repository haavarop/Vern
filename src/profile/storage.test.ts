import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildStoredProfile, fetchProfile } from './storage.ts'

function sequence(...steps: Array<Response | Error>): typeof fetch {
  let call = 0
  return (async () => {
    const step = steps[Math.min(call++, steps.length - 1)]
    if (step instanceof Error) throw step
    return step
  }) as typeof fetch
}

test('fetchProfile retries until the API is up', async () => {
  const fetcher = sequence(new TypeError('fetch failed'), new Response('', { status: 500 }), Response.json({ onboarded: true }))
  assert.deepEqual(await fetchProfile({ delayMs: 0, fetcher }), { onboarded: true })
})

test('fetchProfile gives up after the last attempt', async () => {
  const fetcher = sequence(new Response('', { status: 502 }))
  await assert.rejects(fetchProfile({ attempts: 3, delayMs: 0, fetcher }), /Vi fikk ikke hentet profilen din/)
})

test('fetchProfile does not retry client errors', async () => {
  let calls = 0
  const fetcher = (async () => { calls++; return new Response('', { status: 404 }) }) as typeof fetch
  await assert.rejects(fetchProfile({ delayMs: 0, fetcher }))
  assert.equal(calls, 1)
})

test('buildStoredProfile stores «Om deg» only when something is filled in', () => {
  const empty = buildStoredProfile({ answers: null, insurances: {}, aboutYou: { age: null, occupation: null, hasChildren: null, interests: [] } })
  assert.equal(empty.aboutYou, null)
  assert.deepEqual(empty.callbacks, [])
  const filled = buildStoredProfile({ answers: null, insurances: {}, journey: 'ny', aboutYou: { age: 30, occupation: null, hasChildren: null, interests: ['bil'] } })
  assert.deepEqual(filled.aboutYou, { age: 30, occupation: null, hasChildren: null, interests: ['bil'] })
  assert.equal(filled.journey, 'ny')
})
