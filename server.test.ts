import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { createChatServer } from './server.ts'
import { insuranceData } from './insurance-data.ts'

test('chat API forwards conversation and validates requests', async () => {
  const server = createChatServer(async (messages) => `Received: ${messages.at(-1)?.content}`, async () => ({
    ...insuranceData,
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