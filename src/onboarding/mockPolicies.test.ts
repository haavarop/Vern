import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getInsurer } from './insurers.ts'
import { generatePolicies, referenceWords } from './mockPolicies.ts'

test('generatePolicies is deterministic per insurer', () => {
  assert.deepEqual(generatePolicies('if'), generatePolicies('if'))
  assert.notDeepEqual(generatePolicies('if'), generatePolicies('gjensidige'))
  assert.equal(referenceWords('if'), referenceWords('if'))
})

test('policies are valid for their insurer', () => {
  for (const id of ['if', 'gjensidige', 'storebrand', 'agria', 'dnb-liv', 'landkreditt']) {
    const insurer = getInsurer(id)!
    const policies = generatePolicies(id)
    assert.ok(policies.length >= 1 && policies.length <= 4)
    assert.equal(new Set(policies.map((p) => p.product)).size, policies.length)
    for (const policy of policies) {
      assert.equal(policy.insurerId, id)
      assert.ok(insurer.segments.includes(policy.category))
      assert.ok(Number.isInteger(policy.premium) && policy.premium >= 0)
      assert.match(policy.policyNumber, /^[A-Z0-9]{1,3}-\d{7}$/)
      assert.match(policy.renewalDate, /^2026-|^2027-/)
    }
  }
})

test('jbf returns no policies and unknown ids throw', () => {
  assert.deepEqual(generatePolicies('jbf'), [])
  assert.throws(() => generatePolicies('finnes-ikke'))
})
