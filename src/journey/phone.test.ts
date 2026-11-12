import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatPhone, normalizePhone } from './phone.ts'

test('normalizePhone accepts spaces and +47 / 0047 prefixes', () => {
  assert.equal(normalizePhone('91234567'), '91234567')
  assert.equal(normalizePhone(' 912 34 567 '), '91234567')
  assert.equal(normalizePhone('+47 912 34 567'), '91234567')
  assert.equal(normalizePhone('+4791234567'), '91234567')
  assert.equal(normalizePhone('0047 22 33 44 55'), '22334455')
  assert.equal(normalizePhone('912-34-567'), '91234567')
})

test('normalizePhone rejects numbers that are not Norwegian 8-digit numbers', () => {
  assert.equal(normalizePhone(''), null)
  assert.equal(normalizePhone('9123456'), null)
  assert.equal(normalizePhone('912345678'), null)
  assert.equal(normalizePhone('9123456a'), null)
  assert.equal(normalizePhone('telefon'), null)
  assert.equal(normalizePhone('01234567'), null)
  assert.equal(normalizePhone('11234567'), null)
  assert.equal(normalizePhone('+46 912 34 567'), null)
  assert.equal(normalizePhone('+47'), null)
})

test('formatPhone groups 8 digits as 3-2-3', () => {
  assert.equal(formatPhone('91234567'), '912\u00a034\u00a0567')
})
