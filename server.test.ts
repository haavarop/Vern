import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { createChatServer } from './server.ts'
import { insuranceData } from './insurance-data.ts'

test('chat API forwards conversation and validates requests', async () => {
  const server = createChatServer(async (messages) => `Received: ${messages.at(-1)?.content}`, async () => ({
    ...insuranceData,
    observations: insuranceData.observations.map((observation) => ({ ...observation, dataStatus: 'snapshot' as const })),
    generatedAt: '2026-11-11T00:00:00.000Z',
    refresh: { bi: { status: 'error' as const, sourceUrl: 'https://example.com', error: 'test' }, fremtind: { status: 'error' as const, sourceUrl: 'https://example.com', error: 'test' } },
    registry: { source: 'test', fetchedAt: '2026-11-11T00:00:00.000Z', results: [] },
  }))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}/api/chat`
  try {
    const dataResponse = await fetch(`http://127.0.0.1:${address.port}/api/insurance-data`)
    assert.equal(dataResponse.status, 200)
    const data = await dataResponse.json() as { companies: string[]; observations: unknown[]; registry: { source: string } }
    assert.ok(data.companies.includes('Gjensidige'))
    assert.ok(data.observations.length > 0)
    assert.equal(data.registry.source, 'test')
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { reply: 'Received: Hello' })
    const invalid = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [] }) })
    assert.equal(invalid.status, 400)
    const malformed = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
    assert.equal(malformed.status, 400)
    const wrongType = await fetch(url, { method: 'POST', body: '{}' })
    assert.equal(wrongType.status, 415)
  } finally {
    server.close()
  }
})
test('profile API returns {} for new customers and persists saved profiles', async () => {
  const { mkdtemp, readFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = await mkdtemp(join(tmpdir(), 'vern-profile-'))
  const path = join(dir, 'nested', 'profile.json')
  const server = createChatServer(async () => '', undefined, path)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}/api/profile`
  try {
    assert.deepEqual(await (await fetch(url)).json(), {})

    const profile = { version: 1, onboarded: true, valueProfile: null, insurances: {} }
    const saved = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
    assert.equal(saved.status, 200)
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), profile)
    assert.deepEqual(await (await fetch(url)).json(), profile)

    const invalid = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '[]' })
    assert.equal(invalid.status, 400)

    assert.equal((await fetch(url, { method: 'DELETE' })).status, 200)
    assert.deepEqual(await (await fetch(url)).json(), {})
  } finally {
    server.close()
    await rm(dir, { recursive: true, force: true })
  }
})

test('match API returns sorted matches and validates requests', async () => {
  const server = createChatServer(async () => '')
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}/api/match`
  const post = (body: unknown) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const weights = { pris: 80, dekning: 40, hjelp: 20, enkelhet: 60 }
  try {
    const response = await post({ weights, segments: ['skade'], currentInsurerIds: ['if'] })
    assert.equal(response.status, 200)
    const { matches } = await response.json() as { matches: { insurerId: string; score: number; isCurrent: boolean }[] }
    assert.ok(matches.length > 0)
    assert.deepEqual(matches.map((m) => m.score), matches.map((m) => m.score).toSorted((a, b) => b - a))
    assert.equal(matches.find((m) => m.insurerId === 'if')?.isCurrent, true)
    for (const invalid of [
      { weights: { ...weights, pris: 101 }, segments: [], currentInsurerIds: [] },
      { weights: { pris: 50 }, segments: [], currentInsurerIds: [] },
      { weights, segments: [1], currentInsurerIds: [] },
      { weights, segments: [], currentInsurerIds: Array(51).fill('if') },
    ]) {
      assert.equal((await post(invalid)).status, 400)
    }
  } finally {
    server.close()
  }
})
