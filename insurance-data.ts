export type InsuranceObservation = {
  company: string | null
  metric: string
  value: number
  unit: string
  period: string
  scope: string
  source: string
  sourceUrl: string
}

const biUrl = 'https://www.bi.no/forskning/norsk-kundebarometer/bransjeresultater-2026/'
const fremtindUrl = 'https://www.fremtind.no/om-oss/finansiell-informasjon'
const finknSkadeUrl = 'https://rapport.finkn.no/book/Skadeforsikring'
const finknPersonUrl = 'https://rapport.finkn.no/book/Personforsikring'

const biScores = [
  { company: 'Tryg', satisfaction: 80.6, loyalty: 85.5 },
  { company: 'Gjensidige', satisfaction: 78.8, loyalty: 83.5 },
  { company: 'If', satisfaction: 75.5, loyalty: 76.8 },
  { company: 'Fremtind', satisfaction: 74.0, loyalty: 78.9 },
]

export const insuranceObservations: InsuranceObservation[] = [
  ...biScores.flatMap(({ company, satisfaction, loyalty }) => [
    { company, metric: 'Kundetilfredshet', value: satisfaction, unit: 'indekspoeng', period: '2026', scope: 'Skadeforsikring', source: 'Norsk kundebarometer', sourceUrl: biUrl },
    { company, metric: 'Lojalitet', value: loyalty, unit: 'indekspoeng', period: '2026', scope: 'Skadeforsikring', source: 'Norsk kundebarometer', sourceUrl: biUrl },
  ]),
  ...[
    { metric: 'Inntekter fra forsikringstjenester', value: 18373, unit: 'MNOK' },
    { metric: 'Resultat fra forsikringstjenester', value: 4280, unit: 'MNOK' },
    { metric: 'Resultat før skatt', value: 4933, unit: 'MNOK' },
    { metric: 'Netto inntekt fra investeringer', value: 1034, unit: 'MNOK' },
    { metric: 'Combined ratio', value: 76.7, unit: '%' },
    { metric: 'Solvensmargin', value: 189, unit: '%' },
  ].map((item) => ({ ...item, company: 'Fremtind', period: 'Q3 2026', scope: item.metric === 'Combined ratio' ? 'Netto etter gjenforsikring' : 'Fremtind, per tredje kvartal', source: 'Fremtind, finansiell informasjon', sourceUrl: fremtindUrl })),
  ...[
    { metric: 'Mottatte klagesaker', value: 2885, unit: 'saker', scope: 'Skadeforsikring, alle foretak' },
    { metric: 'Andel klager: bygning og innbo', value: 37, unit: '%', scope: 'Mottatte skadeforsikringsklager, alle foretak' },
    { metric: 'Andel klager: motorvogn', value: 20, unit: '%', scope: 'Mottatte skadeforsikringsklager, alle foretak' },
    { metric: 'Andel klager: reise', value: 11, unit: '%', scope: 'Mottatte skadeforsikringsklager, alle foretak' },
    { metric: 'Medhold i sekretariatet', value: 21, unit: '%', scope: 'Realitetsbehandlede skadeforsikringssaker, helt eller delvis medhold, alle foretak' },
    { metric: 'Nemndsavgjørelser', value: 453, unit: 'avgjørelser', scope: 'FinKN Skade, alle foretak' },
    { metric: 'Medhold i nemnd', value: 15.2, unit: '%', scope: 'FinKN Skade, helt eller delvis medhold, alle foretak' },
  ].map((item) => ({ ...item, company: null, period: '2025', source: 'Finansklagenemnda, årsrapport', sourceUrl: item.metric === 'Medhold i nemnd' ? 'https://rapport.finkn.no/book/N%C3%B8kkeltall2' : finknSkadeUrl })),
  ...[
    { metric: 'Mottatte klagesaker', value: 1160, unit: 'saker', scope: 'Personforsikring, alle foretak' },
    { metric: 'Andel klager: liv og uførhet', value: 23.8, unit: '%', scope: 'Personforsikring, alle foretak' },
    { metric: 'Andel klager: sykeforsikring', value: 20.9, unit: '%', scope: 'Personforsikring, alle foretak' },
    { metric: 'Andel klager: ulykke', value: 18.7, unit: '%', scope: 'Personforsikring, alle foretak' },
    { metric: 'Andel klager: yrkesskade', value: 17.8, unit: '%', scope: 'Personforsikring, alle foretak' },
    { metric: 'Medhold i sekretariatet', value: 25.2, unit: '%', scope: 'Realitetsbehandlede personforsikringssaker, helt eller delvis medhold, alle foretak' },
    { metric: 'Medhold i nemnd', value: 22.4, unit: '%', scope: 'FinKN Person, helt eller delvis medhold, alle foretak' },
  ].map((item) => ({ ...item, company: null, period: '2025', source: 'Finansklagenemnda, årsrapport', sourceUrl: finknPersonUrl })),
]

export const insuranceData = {
  collectedAt: '2026-11-11',
  companies: ['Gjensidige', 'If', 'Tryg', 'Fremtind'],
  observations: insuranceObservations,
  sources: [
    { name: 'Norsk kundebarometer', url: biUrl, status: 'Tall for tilfredshet og lojalitet er registrert.' },
    { name: 'EPSI Rating', url: 'https://www.epsi-norway.org/bransjestudier/forsikring/', status: 'Forsikringsstudie tilgjengelig, men selskapstall ikke verifisert her.' },
    { name: 'Finansklagenemnda', url: 'https://www.finkn.no/om-oss/arsrapporter', status: 'Aggregerte klage- og utfallstall er registrert; de er ikke tall per selskap.' },
    { name: 'Finanstilsynet', url: 'https://www.finanstilsynet.no/analyser-og-statistikk/api-for-apne-data/', status: 'Foretakssøk hentes fra API-et; treffene må ikke forveksles med bekreftede selskapskoblinger.' },
    { name: 'Finansportalen', url: 'https://www.forbrukerradet.no/finansportalen/', status: 'Ingen verifiserte sammenlignbare forsikringspriser er hentet inn her.' },
    { name: 'Fremtind', url: fremtindUrl, status: 'Utvalgte finansielle nøkkeltall er registrert.' },
    { name: 'Tryg', url: 'https://tryg.com/en/downloads-all', status: 'Rapporter tilgjengelige; tall er ikke hentet inn her.' },
  ],
  limitations: [
    'Observasjonene er et manuelt innhentet øyeblikksbilde. Kun registertreffene hentes fra et API; Finanstilsynet kan mellomlagre svar i opptil én time.',
    'Trygghetsbehov, behov for hjelp, enkelhetsbehov og risikovilje er individuelle behov og kan ikke utledes fra selskapstallene.',
    'Priser avhenger av kunde, produkt og risiko; dekninger og vilkår må undersøkes i konkrete avtaler.',
    'Kundeopplevelse, klager per selskap, klageårsak, skadeoppgjør og flere selskapers nøkkeltall mangler eller er ikke verifisert.',
    'Andeler klager etter produkt er ikke antall klager fordelt på årsak.',
    'Tall fra ulike perioder, segmenter og kilder er ikke nødvendigvis direkte sammenlignbare.',
  ],
}

const registryBaseUrl = 'https://api.finanstilsynet.no/registry/v2/legal-entities/search'
const registryQueries = [
  { company: 'Gjensidige', query: 'Gjensidige' },
  { company: 'If', query: 'If Skadeforsikring' },
  { company: 'Tryg', query: 'Tryg' },
  { company: 'Fremtind', query: 'Fremtind' },
]

type RegistryEntity = {
  name: string
  organisationNumber: string | null
  finanstilsynetId: string
  legalEntityId: number
}

export async function fetchRegistryData(fetcher: typeof fetch = fetch) {
  const results = await Promise.all(registryQueries.map(async ({ company, query }) => {
    const url = new URL(registryBaseUrl)
    url.searchParams.set('query', query)
    url.searchParams.set('pageSize', '50')
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (!data || typeof data !== 'object' || !('total' in data) || typeof data.total !== 'number' ||
        !('legalEntities' in data) || !Array.isArray(data.legalEntities)) throw new Error('Ugyldig API-svar')
      const entities: RegistryEntity[] = data.legalEntities.filter((entity: unknown) => {
        if (!entity || typeof entity !== 'object' || !('name' in entity) || typeof entity.name !== 'string' ||
          !('legalEntityType' in entity) || typeof entity.legalEntityType !== 'string') throw new Error('Ugyldig foretaksdata')
        const name = entity.name.toLocaleLowerCase('nb-NO')
        return entity.legalEntityType === 'Company' && name.includes(company.toLocaleLowerCase('nb-NO')) && name.includes('forsikring')
      }).map((entity: unknown) => {
        if (!entity || typeof entity !== 'object' || !('name' in entity) || typeof entity.name !== 'string' ||
          !('legalEntityId' in entity) || typeof entity.legalEntityId !== 'number' ||
          !('finanstilsynetId' in entity) || typeof entity.finanstilsynetId !== 'string') throw new Error('Ugyldig foretaksdata')
        return {
          name: entity.name,
          legalEntityId: entity.legalEntityId,
          finanstilsynetId: entity.finanstilsynetId,
          organisationNumber: 'organisationNumber' in entity && typeof entity.organisationNumber === 'string' ? entity.organisationNumber : null,
        }
      })
      return { company, query, sourceUrl: url.toString(), status: 'ok' as const, total: data.total, truncated: data.total > data.legalEntities.length, entities }
    } catch (error) {
      return { company, query, sourceUrl: url.toString(), status: 'error' as const, error: error instanceof Error ? error.message : 'Ukjent feil' }
    }
  }))
  return { source: 'Finanstilsynet virksomhetsregister', fetchedAt: new Date().toISOString(), results }
}

export async function getInsuranceData() {
  return { ...insuranceData, registry: await fetchRegistryData() }
}