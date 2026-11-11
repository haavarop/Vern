import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchProfile } from './storage.ts'

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
  await assert.rejects(fetchProfile({ attempts: 3, delayMs: 0, fetcher }), /Kunne ikke hente profilen/)
})

test('fetchProfile does not retry client errors', async () => {
  let calls = 0
  const fetcher = (async () => { calls++; return new Response('', { status: 404 }) }) as typeof fetch
  await assert.rejects(fetchProfile({ delayMs: 0, fetcher }))
  assert.equal(calls, 1)
})
