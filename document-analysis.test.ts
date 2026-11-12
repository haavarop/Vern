import { test } from 'node:test'
import assert from 'node:assert/strict'
import { amount, analyzeDocument, DocumentError, isoDate, parseExtraction, selectRelevantText } from './document-analysis.ts'
import { findInsurerByName } from './src/onboarding/insurers.ts'

/** What the model is expected to return for the Gjensidige "Innbo Ung" document (Forsikringsdokument.pdf). */
const innboUng = {
  insurer: 'Gjensidige Forsikring ASA',
  issuedAt: '2025-12-11',
  policies: [{
    product: 'Innbo Ung - Hele landet',
    category: 'skade',
    policyNumber: '93291509',
    annualPremium: '1 980',
    validFrom: '15.01.2026',
    sumInsured: 500000,
    deductible: 3000,
    coverageSummary: 'Innbo og løsøre i bolig i hele landet, med Innbo Pluss-dekninger.',
    coverages: [
      { name: 'Innbo Pluss', deductible: 3000 },
      { name: 'Innbosum', sumInsured: 500000 },
      { name: 'Ansvar', sumInsured: 5000000, deductible: 4000 },
      { name: 'Rettshjelp', sumInsured: 100000, note: 'Se vilkår' },
      { name: '', sumInsured: 1 },
    ],
    exclusions: ['Kryptovaluta', 'Skade som skyldes søl over tid eller kondens'],
    notes: ['Klokker erstattes nå etter markedsverdi'],
    // Personal data must never come through, even if the model includes it.
    customerName: 'Oscar Selnes Bognæs',
    address: 'Oskar Braatens gate 22',
  }],
  warnings: [],
}

test('parses amounts and dates the way they appear in Norwegian documents', () => {
  assert.equal(amount('1 980'), 1980)
  assert.equal(amount('kr 1.980,-'), 1980)
  assert.equal(amount('5 000 000'), 5_000_000)
  assert.equal(amount(1980.4), 1980)
  assert.equal(amount('Se vilkår'), undefined)
  assert.equal(amount(-5), undefined)
  assert.equal(isoDate('15.01.2026'), '2026-01-15')
  assert.equal(isoDate('2026-01-15'), '2026-01-15')
  assert.equal(isoDate('31.02.2026'), undefined)
  assert.equal(isoDate('neste år'), undefined)
})

test('maps company names from documents to known insurers', () => {
  assert.equal(findInsurerByName('Gjensidige Forsikring ASA')?.id, 'gjensidige')
  assert.equal(findInsurerByName('If Skadeforsikring NUF')?.id, 'if')
  assert.equal(findInsurerByName('Tryg Forsikring')?.id, 'tryg')
  assert.equal(findInsurerByName('Helt Ukjent Forsikring AS'), undefined)
})

test('turns the model output into a validated policy without personal data', () => {
  const { policies, warnings } = parseExtraction(innboUng, 'Forsikringsdokument.pdf', new Date('2026-11-11T12:00:00Z'))
  assert.equal(policies.length, 1)
  const [policy] = policies
  assert.equal(policy.insurerId, 'gjensidige')
  assert.equal(policy.insurer, 'Gjensidige')
  assert.equal(policy.product, 'Innbo Ung - Hele landet')
  assert.equal(policy.annualPremium, 1980)
  assert.equal(policy.premium, 165)
  assert.equal(policy.deductible, 3000)
  assert.equal(policy.sumInsured, 500000)
  assert.equal(policy.validFrom, '2026-01-15')
  assert.equal(policy.renewalDate, '2027-01-15', 'falls back to one year after "gjelder fra"')
  assert.deepEqual(policy.coverages?.map((line) => line.name), ['Innbo Pluss', 'Innbosum', 'Ansvar', 'Rettshjelp'])
  assert.deepEqual(policy.coverages?.[3], { name: 'Rettshjelp', sumInsured: 100000, note: 'Se vilkår' })
  assert.deepEqual(policy.source, { type: 'document', fileName: 'Forsikringsdokument.pdf', issuedAt: '2025-12-11', analyzedAt: '2026-11-11T12:00:00.000Z' })
  assert.ok(!JSON.stringify(policy).includes('Oscar') && !JSON.stringify(policy).includes('Braatens'))
  assert.deepEqual(warnings, [])
})

test('handles unknown insurers, invalid categories and missing prices', () => {
  const { policies, warnings } = parseExtraction({
    insurer: 'Småbyen Brannkasse',
    policies: [{ product: 'Hus', category: 'bil', policyNumber: 12345 }, { category: 'skade' }, 'tull'],
  }, 'hus.pdf')
  assert.equal(policies.length, 1)
  assert.equal(policies[0].insurerId, 'smabyen-brannkasse')
  assert.equal(policies[0].insurer, 'Småbyen Brannkasse')
  assert.equal(policies[0].category, 'skade')
  assert.equal(policies[0].premium, 0)
  assert.equal(policies[0].policyNumber, '')
  assert.equal(policies[0].renewalDate, '')
  assert.deepEqual(warnings, ['Fant ikke pris for Hus.'])
  assert.deepEqual(parseExtraction('ikke json', 'x.pdf').policies, [])
})

test('prefers customer-specific pages when the document is too long', () => {
  const pages = ['Generelle vilkår '.repeat(50), '', 'FORSIKRINGSOVERSIKT Pris 1 980', 'Erstatningsregler '.repeat(50), 'Forsikringsbevis Egenandel 3 000']
  const text = selectRelevantText(pages, 900)
  assert.match(text, /--- Side 3 ---\nFORSIKRINGSOVERSIKT/)
  assert.match(text, /--- Side 5 ---\nForsikringsbevis/)
  assert.ok(text.indexOf('Side 3') < text.indexOf('Side 5'), 'keeps page order')
  assert.doesNotMatch(text, /Side 2 ---/, 'skips empty pages')
})

test('rejects files that are not PDFs before calling the model', async () => {
  let called = false
  await assert.rejects(
    analyzeDocument(new TextEncoder().encode('hei'), 'notat.txt', async () => { called = true; return '{}' }),
    (error) => error instanceof DocumentError && error.status === 415,
  )
  assert.equal(called, false)
})
