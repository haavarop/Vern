import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fetchRegistryData, getInsuranceData, insuranceData, insuranceObservations, parseBiScores, parseFremtindFigures } from './insurance-data.ts'

test('curated JSON has the requested categories and only documented scores', async () => {
  const data = JSON.parse(await readFile(new URL('./insurance-data.json', import.meta.url), 'utf8')) as {
    kategorier: Record<string, Array<{ selskap: string; score: number; enhet: string; periode: string; kilde: string; kildeUrl: string }>>
  }
  assert.deepEqual(Object.keys(data.kategorier), ['kundetilfredshet', 'lojalitet', 'kundeopplevelse', 'klager', 'tvister', 'utfall', 'priser', 'dekninger', 'vilkår', 'skadeoppgjør', 'drift'])
  const containsNull = (value: unknown): boolean => value === null || (typeof value === 'object' && Object.values(value).some(containsNull))
  assert.equal(containsNull(data), false)
  for (const scores of Object.values(data.kategorier)) {
    assert.ok(Array.isArray(scores))
    for (const score of scores) {
      assert.ok(score.selskap && score.enhet && score.periode && score.kilde)
      assert.ok(Number.isFinite(score.score))
      assert.equal(new URL(score.kildeUrl).protocol, 'https:')
    }
  }
})

test('complaint outcomes use the number of cases considered on their merits', async () => {
  const data = JSON.parse(await readFile(new URL('./insurance-data.json', import.meta.url), 'utf8')) as {
    kategorier: {
      klager: Array<{ selskap: string; score: number; kildeUrl: string }>
      utfall: Array<{ selskap: string; score: number; realitetsbehandlede: number; medhold: number; kildeUrl: string }>
    }
  }
  const sourceUrl = 'https://forsikring.ai/data/klagestatistikk-selskap.csv'
  const cases = data.kategorier.klager.filter((entry) => entry.kildeUrl === sourceUrl)
  const outcomes = data.kategorier.utfall.filter((entry) => entry.kildeUrl === sourceUrl)
  assert.ok(outcomes.length > 0)
  for (const outcome of outcomes) {
    const complaint = cases.find((entry) => entry.selskap === outcome.selskap)
    assert.ok(complaint)
    assert.ok(outcome.realitetsbehandlede > 0 && outcome.realitetsbehandlede <= complaint.score)
    assert.ok(outcome.medhold >= 0 && outcome.medhold <= outcome.realitetsbehandlede)
    assert.ok(Math.abs(outcome.score - outcome.medhold / outcome.realitetsbehandlede * 100) < 0.051)
  }
})

test('BI score table is parsed with company, period and metric', () => {
  const html = `<table><caption>Skadeforsikring</caption><thead><tr><th>Selskap</th><th>Tilfredshet</th><th>Lojalitet</th></tr></thead><tbody>
    <tr><td>Tryg (skadeforsikring)</td><td>80,6</td><td>85,5</td></tr>
    <tr><td>Gjensidige (skadeforsikring)</td><td>78,8</td><td>83,5</td></tr>
    <tr><td>If</td><td>75,5</td><td>76,8</td></tr>
    <tr><td>Fremtind</td><td>74,0</td><td>78,9</td></tr>
  </tbody></table>`
  const observations = parseBiScores(html)
  assert.equal(observations.length, 8)
  assert.deepEqual(observations[0], { company: 'Tryg', metric: 'Kundetilfredshet', value: 80.6, unit: 'indekspoeng', period: '2026', scope: 'Skadeforsikring', source: 'Norsk kundebarometer', sourceUrl: 'https://www.bi.no/forskning/norsk-kundebarometer/bransjeresultater-2026/' })
  assert.throws(() => parseBiScores(html.replace('80,6', 'mangler')), /Ugyldig BI-verdi/)
  assert.throws(() => parseBiScores('<table></table>'), /mangler forventede kolonner/)
})

test('Fremtind figures retain their published period and units', () => {
  const html = `<h2>Nøkkeltall</h2><div>Fremtind per tredje kvartal 2026:</div><section><ul>
    <li><h4>Inntekter fra forsikringstjenester</h4><p><span>18 373 MNOK</span></p></li>
    <li><h4>Resultat fra forsikringstjenester</h4><p><span>4 280 MNOK</span></p></li>
    <li><h4>Resultat før skatt</h4><p><span>4 933 MNOK</span></p></li>
    <li><h4>Netto inntekt fra investeringer</h4><p><span>1 034 MNOK</span></p></li>
    <li><h4>Combined ratio (netto etter gjenforsikring)</h4><p><span>76,7 %</span></p></li>
    <li><h4>Solvensmargin</h4><p><span>189 %</span></p></li>
  </ul></section>`
  const observations = parseFremtindFigures(html)
  assert.equal(observations.length, 6)
  assert.equal(observations[0].value, 18373)
  assert.equal(observations[0].period, 'Fremtind per tredje kvartal 2026')
  assert.equal(observations[4].value, 76.7)
  assert.throws(() => parseFremtindFigures(html.replace('tredje kvartal 2026', 'ukjent')), /rapporteringsperiode/)
  assert.throws(() => parseFremtindFigures(html.replace('18 373 MNOK', 'ukjent')), /Ugyldig Fremtind-verdi/)
})

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

test('failed sources use clearly labeled snapshot observations', async () => {
  const data = await getInsuranceData(async () => new Response('Unavailable', { status: 503 }))
  assert.equal(data.refresh.bi.status, 'error')
  assert.equal(data.refresh.fremtind.status, 'error')
  assert.ok(data.registry.results.every((result) => result.status === 'error'))
  assert.equal(data.observations.length, insuranceObservations.length)
  assert.ok(data.observations.every((observation) => observation.dataStatus === 'snapshot'))
})

test('refreshed BI scores replace the snapshot without duplicating it', async () => {
  const rows = ['Tryg (skadeforsikring)', 'Gjensidige (skadeforsikring)', 'If', 'Fremtind']
    .map((company) => `<tr><td>${company}</td><td>81,0</td><td>82,0</td></tr>`).join('')
  const html = `<table><caption>Skadeforsikring</caption><thead><tr><th>Selskap</th><th>Tilfredshet</th><th>Lojalitet</th></tr></thead><tbody>${rows}</tbody></table>`
  const data = await getInsuranceData(async (input) => String(input).includes('bi.no')
    ? new Response(html)
    : new Response('Unavailable', { status: 503 }))
  const scores = data.observations.filter((observation) => observation.source === 'Norsk kundebarometer')
  assert.equal(data.refresh.bi.status, 'ok')
  assert.equal(data.refresh.fremtind.status, 'error')
  assert.equal(scores.length, 8)
  assert.ok(scores.every((observation) => observation.dataStatus === 'refreshed'))
  assert.ok(scores.some((observation) => observation.company === 'Tryg' && observation.metric === 'Kundetilfredshet' && observation.value === 81))
})