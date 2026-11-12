import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { buildMockCandidates, buildRecommendationPrompt, createAppServer, loadRecommendationPrompt, recommend, resolveGaps, resolveRecommendations, resolveValueProfileSuggestion, suggestValueProfile } from './server.ts'
import type { PersonaPass } from './src/persona/pass.ts'
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
    assert.deepEqual(results.gaps, [])
    assert.deepEqual(results.recommendations, [
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
    assert.deepEqual(first.recommendations.map((item) => item.insurance), ['Bilforsikring'])
    await writeFile(profilePath, JSON.stringify({ insurances: { if: [car, house] } }))
    const second = await recommend(profilePath, insurancePath, async () => ({ selections: [{ policyIndex: 0, candidateIndex: 0 }, { policyIndex: 1, candidateIndex: 0 }] }))
    assert.deepEqual(second.recommendations.map((item) => item.insurance), ['Bilforsikring', 'Husforsikring'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('recommendation endpoint returns structured cards', async () => {
  const server = createAppServer(undefined, undefined, undefined, async () => ({ recommendations: [{ insurance: 'Bilforsikring', company: 'If', price: 500 }], gaps: [] }))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/recommendations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { recommendations: [{ insurance: 'Bilforsikring', company: 'If', price: 500 }], gaps: [] })
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

const persona: PersonaPass = {
  format: 'persona-pass/v1',
  issuer: 'DigiU',
  name: 'Sofie',
  issuedAt: '2026-11-11T20:00:00.000Z',
  traits: [
    { category: 'Home', value: 'You recently moved and are furnishing your home', confidence: 'strong' },
    { category: 'Pets', value: 'You have a dog', confidence: 'likely' },
  ],
}

test('picks keep the model reason only for a valid, unambiguous selection', () => {
  const candidates = [{ policyIndex: 0, insurance: 'Bilforsikring', candidates: [{ company: 'If', price: 500 }, { company: 'Tryg', price: 700 }] }]
  assert.deepEqual(resolveRecommendations(candidates, { selections: [{ policyIndex: 0, candidateIndex: 1, reason: '  Best skadeoppgjør. ' }] }),
    [{ insurance: 'Bilforsikring', company: 'Tryg', price: 700, reason: 'Best skadeoppgjør.' }])
  assert.deepEqual(resolveRecommendations(candidates, { selections: [{ policyIndex: 0, candidateIndex: 0, reason: 'A' }, { policyIndex: 0, candidateIndex: 1, reason: 'B' }] }),
    [{ insurance: 'Bilforsikring', company: 'If', price: 500, fallback: true }])
})

test('gaps must be new catalogue products that quote a shared trait', () => {
  const result = { gaps: [
    { product: 'Hundeforsikring', reason: 'Du har hund.', lookFor: 'Veterinærutgifter.', basedOn: ['you have a dog', 'You own a horse'] },
    { product: 'Hundeforsikring', reason: 'Igjen.', lookFor: 'Igjen.', basedOn: ['You have a dog'] },
    { product: 'Innboforsikring', reason: 'Nytt hjem.', lookFor: 'Forsikringssum.', basedOn: ['You recently moved and are furnishing your home'] },
    { product: 'Romforsikring', reason: 'Finnes ikke.', lookFor: 'x', basedOn: ['You have a dog'] },
    { product: 'Reiseforsikring (helårs)', reason: 'Ingen grunnlag.', lookFor: 'x', basedOn: ['You travel a lot'] },
  ] }
  assert.deepEqual(resolveGaps(result, ['Innboforsikring'], persona), [
    { product: 'Hundeforsikring', segment: 'dyr', reason: 'Du har hund.', lookFor: 'Veterinærutgifter.', basedOn: ['You have a dog'] },
  ])
  assert.deepEqual(resolveGaps(result, [], null), [])
})

test('a shared Persona Pass reaches the recommendation prompt, and gaps work without policies', async () => {
  assert.match(buildRecommendationPrompt({ persona }, {}), /You have a dog/)
  assert.doesNotMatch(buildRecommendationPrompt({}, {}), /DigiU/)
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = await mkdtemp(join(tmpdir(), 'vern-persona-'))
  const profilePath = join(dir, 'profile.json')
  const insurancePath = join(dir, 'insurance.json')
  try {
    await writeFile(insurancePath, JSON.stringify({ kategorier: {} }))
    await writeFile(profilePath, JSON.stringify({ persona }))
    let prompt = ''
    const result = await recommend(profilePath, insurancePath, async (text) => {
      prompt = text
      return { selections: [], gaps: [{ product: 'Hundeforsikring', reason: 'Du har hund.', lookFor: 'Veterinær.', basedOn: ['You have a dog'] }] }
    })
    assert.match(prompt, /opptil tre forsikringer/)
    assert.deepEqual(result.recommendations, [])
    assert.deepEqual(result.gaps.map((gap) => gap.product), ['Hundeforsikring'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('value-profile suggestions keep valid options and deliberate nulls only', async () => {
  const suggestion = resolveValueProfileSuggestion({
    viktigst: { option: 1, reason: 'Du har nettopp flyttet.' },
    utsagn: { option: null, reason: 'DigiU-profilen sier ikke noe om dette.' },
    skade: { option: 9, reason: 'Ugyldig.' },
  })
  assert.deepEqual(suggestion.answers, { viktigst: 1, utsagn: null, skade: null, handtere: null })
  assert.deepEqual(suggestion.reasons, { viktigst: 'Du har nettopp flyttet.', utsagn: 'DigiU-profilen sier ikke noe om dette.' })

  let request = ''
  await suggestValueProfile(persona, async (_system, text) => { request = text; return {} })
  assert.match(request, /You have a dog/)
  assert.doesNotMatch(request, /Sofie/)
})

test('persona endpoint validates the pass before asking the model', async () => {
  let asked = 0
  const server = createAppServer(undefined, undefined, undefined, undefined, async () => {
    asked += 1
    return { answers: { viktigst: 1, utsagn: null, skade: null, handtere: null }, reasons: { viktigst: 'Grunn.' } }
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}/api/persona/value-profile`
  try {
    const ok = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(persona) })
    assert.equal(ok.status, 200)
    assert.equal((await ok.json() as { answers: Record<string, number | null> }).answers.viktigst, 1)
    const invalid = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...persona, traits: [] }) })
    assert.equal(invalid.status, 400)
    assert.equal(asked, 1)
  } finally {
    server.close()
  }
})
