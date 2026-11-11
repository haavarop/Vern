import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { createChatServer } from './server.ts'

test('chat API forwards conversation and validates requests', async () => {
  const server = createChatServer(async (messages) => `Received: ${messages.at(-1)?.content}`)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}/api/chat`
  try {
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