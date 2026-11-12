import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodePersonaPass, encodePersonaPass, parsePersonaPass, type PersonaPass } from './pass.ts'

const pass: PersonaPass = {
  format: 'persona-pass/v1',
  issuer: 'The Digital You',
  name: 'Sofie',
  issuedAt: '2026-11-11T20:00:00.000Z',
  traits: [
    { category: 'Home', value: 'You recently moved and are furnishing your home', confidence: 'strong' },
    { category: 'Pets', value: 'You have a dog · Ærlig', confidence: 'likely' },
  ],
}

test('a pass survives the URL fragment round trip, including non-ASCII text', () => {
  const encoded = encodePersonaPass(pass)
  assert.match(encoded, /^[A-Za-z0-9_-]+$/)
  assert.deepEqual(decodePersonaPass(`#pass=${encoded}`), pass)
  assert.deepEqual(decodePersonaPass(`pass=${encoded}`), pass)
})

test('a pass keeps only known fields', () => {
  const parsed = parsePersonaPass({ ...pass, email: 'x@example.com', traits: [{ ...pass.traits[0], evidence: ['secret'] }] })
  assert.deepEqual(parsed, { ...pass, traits: [pass.traits[0]] })
})

test('invalid or missing passes are rejected', () => {
  assert.equal(decodePersonaPass(''), null)
  assert.equal(decodePersonaPass('#pass=not+base64'), null)
  assert.equal(decodePersonaPass(`#pass=${btoa('{')}`), null)
  assert.equal(parsePersonaPass({ ...pass, format: 'persona-pass/v2' }), null)
  assert.equal(parsePersonaPass({ ...pass, traits: [] }), null)
  assert.equal(parsePersonaPass({ ...pass, issuedAt: 'yesterday' }), null)
  assert.equal(parsePersonaPass({ ...pass, traits: [{ ...pass.traits[0], confidence: 'certain' }] }), null)
  assert.equal(parsePersonaPass({ ...pass, traits: [{ ...pass.traits[0], value: 'x'.repeat(201) }] }), null)
})
