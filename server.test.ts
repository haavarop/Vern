import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { buildMockCandidates, buildRecommendationPrompt, createAppServer, loadRecommendationPrompt, recommend, resolveRecommendations } from './server.ts'
import { insuranceData } from './insurance-data.ts'

test('recommendation candidates use only matching mock products and prices', async () => {
  const { generatePolicies } = await import('./src/onboarding/mockPolicies.ts')
  const policy = generatePolicies('gjensidige')[0]
  const result = buildMockCandidates({ insurances: { gjensidige: [policy] } })
  assert.equal(result.length, 1)
  assert.equal(result[0].insurance, policy.product)
  assert.deepEqual(result[0].candidates[0], { company: policy.insurer, price: policy.premium })
  assert.throws(() => buildMockCandidates({ insurances: { test: [{ product: 'Bil', insurer: 'If' }] } }), /demopris/)
  assert.throws(() => buildMockCandidates({ insurances: { test: {} } }), /Ugyldige forsikringer/)
  assert.deepEqual(buildMockCandidates({}), [])
})

test('model selections must match one candidate per policy and cannot supply prices', () => {
  const candidates = [{ policyIndex: 0, insurance: 'Bilforsikring', candidates: [{ company: 'If', price: 500 }, { company: 'Tryg', price: 700 }] }]
  assert.deepEqual(resolveRecommendations(candidates, { selections: [{ policyIndex: 0, candidateIndex: 1, price: 1 }] }), [{ insurance: 'Bilforsikring', company: 'Tryg', price: 700 }])
  assert.deepEqual(resolveRecommendations(candidates, { selections: [{ policyIndex: 0, candidateIndex: 2 }] }), [{ insurance: 'Bilforsikring', company: 'If', price: 500, fallback: true }])
  assert.deepEqual(resolveRecommendations(candidates, { selections: [] }), [{ insurance: 'Bilforsikring', company: 'If', price: 500, fallback: true }])
})

test('every policy gets a result even when model selections are incomplete or duplicated', () => {
  const candidates = buildMockCandidates({ insurances: {
    first: [{ product: 'Bilforsikring', insurer: 'If', premium: 500 }, { product: 'Bilforsikring', insurer: 'If', premium: 600 }],
    second: [{ product: 'Husforsikring', insurer: 'Tryg', premium: 700 }],
  } })
  const results = resolveRecommendations(candidates, { selections: [
    { policyIndex: 2, candidateIndex: 0 },
    { policyIndex: 2, candidateIndex: 0 },
    { policyIndex: 0, candidateIndex: 999 },
  ] })
  assert.equal(results.length, 3)
  assert.deepEqual(results.map((result) => result.insurance), ['Bilforsikring', 'Bilforsikring', 'Husforsikring'])
  assert.deepEqual(results.map((result) => result.price), [500, 600, 700])
  assert.equal(results[0].fallback, true)
  assert.equal(results[1].fallback, true)
  assert.notEqual(results[2].fallback, true)
  const conflicting = resolveRecommendations([{ policyIndex: 0, insurance: 'Bilforsikring', candidates: [{ company: 'If', price: 500 }, { company: 'Tryg', price: 700 }] }], { selections: [{ policyIndex: 0, candidateIndex: 0 }, { policyIndex: 0, candidateIndex: 1 }] })
  assert.equal(conflicting[0].fallback, true)
})

test('model failures keep one labeled fallback for every saved policy', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = await mkdtemp(join(tmpdir(), 'vern-recommendation-fallback-'))
  const profilePath = join(dir, 'profile.json')
  const insurancePath = join(dir, 'insurance.json')
  try {
    await writeFile(profilePath, JSON.stringify({ insurances: { if: [
      { product: 'Bilforsikring', insurer: 'If', premium: 500 },
      { product: 'Husforsikring', insurer: 'If', premium: 700 },
    ] } }))
    await writeFile(insurancePath, JSON.stringify({ kategorier: {} }))
    const results = await recommend(profilePath, insurancePath, async () => { throw new Error('test failure') })
    assert.deepEqual(results, [
      { insurance: 'Bilforsikring', company: 'If', price: 500, fallback: true },
      { insurance: 'Husforsikring', company: 'If', price: 700, fallback: true },
    ])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('recommendations use the latest saved profile on each run', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = await mkdtemp(join(tmpdir(), 'vern-recommendation-refresh-'))
  const profilePath = join(dir, 'profile.json')
  const insurancePath = join(dir, 'insurance.json')
  const car = { product: 'Bilforsikring', insurer: 'If', premium: 500 }
  const house = { product: 'Husforsikring', insurer: 'If', premium: 700 }
  try {
    await writeFile(insurancePath, JSON.stringify({ kategorier: {} }))
    await writeFile(profilePath, JSON.stringify({ insurances: { if: [car] } }))
    const first = await recommend(profilePath, insurancePath, async () => ({ selections: [{ policyIndex: 0, candidateIndex: 0 }] }))
    assert.deepEqual(first.map((item) => item.insurance), ['Bilforsikring'])
    await writeFile(profilePath, JSON.stringify({ insurances: { if: [car, house] } }))
    const second = await recommend(profilePath, insurancePath, async () => ({ selections: [{ policyIndex: 0, candidateIndex: 0 }, { policyIndex: 1, candidateIndex: 0 }] }))
    assert.deepEqual(second.map((item) => item.insurance), ['Bilforsikring', 'Husforsikring'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('recommendation endpoint returns structured cards', async () => {
  const server = createAppServer(undefined, undefined, undefined, async () => [{ insurance: 'Bilforsikring', company: 'If', price: 500 }])
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { recommendations: [{ insurance: 'Bilforsikring', company: 'If', price: 500 }] })
    const invalid = await fetch(`http://127.0.0.1:${address.port}/api/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
    assert.equal(invalid.status, 400)
  } finally {
    server.close()
  }
})

test('malformed model output is an upstream failure', async () => {
  const server = createAppServer(undefined, undefined, undefined, async () => { throw new SyntaxError('model response') })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    assert.equal(response.status, 502)
  } finally {
    server.close()
  }
})

test('recommendation prompt includes preferences and policies without policy identifiers', () => {
  const prompt = buildRecommendationPrompt({
    valueProfile: { scores: { dekning: 60 }, ranked: ['dekning'] },
    insurances: { gjensidige: [{ insurer: 'Gjensidige', product: 'Katteforsikring', premium: 228, coverage: 'Pluss', policyNumber: 'SECRET-POLICY' }] },
  }, { kategorier: { kundetilfredshet: [{ selskap: 'Gjensidige', score: 78.8 }] } })
  assert.match(prompt, /Katteforsikring/)
  assert.match(prompt, /78\.8/)
  assert.match(prompt, /"dekning":60/)
  assert.doesNotMatch(prompt, /SECRET-POLICY/)
  assert.match(prompt, /simulerte demodata/)
  assert.match(buildRecommendationPrompt({}, {}), /Forsikringer: \[\]/)
})

test('recommendation prompt reads the current profile and insurance data from disk', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = await mkdtemp(join(tmpdir(), 'vern-recommendation-'))
  const profilePath = join(dir, 'profile.json')
  const insurancePath = join(dir, 'insurance.json')
  try {
    await writeFile(profilePath, JSON.stringify({ insurances: { test: [{ product: 'Husforsikring' }] } }))
    await writeFile(insurancePath, JSON.stringify({ observations: [{ company: 'If', value: 75.5 }] }))
    assert.match(await loadRecommendationPrompt(profilePath, insurancePath), /Husforsikring/)
    await writeFile(insurancePath, JSON.stringify({ kategorier: { lojalitet: [{ selskap: 'Tryg', score: 85.5 }] } }))
    const updatedPrompt = await loadRecommendationPrompt(profilePath, insurancePath)
    assert.match(updatedPrompt, /85\.5/)
    assert.doesNotMatch(updatedPrompt, /75\.5/)
    await writeFile(insurancePath, '{}')
    await assert.rejects(loadRecommendationPrompt(profilePath, insurancePath), /Invalid insurance data/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('insurance data remains available and chat API is removed', async () => {
  const server = createAppServer(async () => ({
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
  try {
    const dataResponse = await fetch(`http://127.0.0.1:${address.port}/api/insurance-data`)
    assert.equal(dataResponse.status, 200)
    const data = await dataResponse.json() as { companies: string[]; observations: unknown[]; registry: { source: string } }
    assert.ok(data.companies.includes('Gjensidige'))
    assert.ok(data.observations.length > 0)
    assert.equal(data.registry.source, 'test')
    const response = await fetch(`http://127.0.0.1:${address.port}/api/chat`, { method: 'POST' })
    assert.equal(response.status, 404)
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
  const server = createAppServer(undefined, path)
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
  const server = createAppServer()
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
