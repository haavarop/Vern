import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchRegistryData, insuranceData, insuranceObservations } from './insurance-data.ts'

test('insurance observations have traceable values and scope', () => {
  assert.ok(insuranceObservations.length > 0)
  for (const observation of insuranceObservations) {
    assert.ok(observation.metric && observation.period && observation.scope)
    assert.ok(Number.isFinite(observation.value))
    assert.equal(new URL(observation.sourceUrl).protocol, 'https:')
  }
})

test('company scores and market-wide complaint figures are kept separate', () => {
  for (const company of insuranceData.companies) {
    assert.ok(insuranceObservations.some((item) => item.company === company && item.metric === 'Kundetilfredshet'))
    assert.ok(insuranceObservations.some((item) => item.company === company && item.metric === 'Lojalitet'))
  }
  assert.ok(insuranceObservations.some((item) => item.company === null && item.metric === 'Mottatte klagesaker'))
})

test('registry API data is fetched and failures remain visible', async () => {
  const requests: string[] = []
  const registry = await fetchRegistryData(async (input) => {
    const url = String(input)
    requests.push(url)
    if (url.includes('Tryg')) return new Response('Unavailable', { status: 503 })
    return Response.json({ total: 2, legalEntities: [
      { name: 'Gjensidige Forsikring ASA', legalEntityType: 'Company', legalEntityId: 123, finanstilsynetId: 'FT123', organisationNumber: '123456789' },
      { name: 'Gjensidige person', legalEntityType: 'Person', legalEntityId: 456, finanstilsynetId: 'FT456' },
    ] })
  })
  assert.equal(requests.length, 4)
  assert.equal(registry.results[0].status, 'ok')
  assert.equal(registry.results[0].entities?.[0].organisationNumber, '123456789')
  assert.equal(registry.results[0].entities?.length, 1)
  assert.equal(registry.results[2].status, 'error')
  assert.equal(registry.results[2].error, 'HTTP 503')
})