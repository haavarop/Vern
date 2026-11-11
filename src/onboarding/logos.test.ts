import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { describe, it } from 'node:test'
import { INSURERS } from './insurers.ts'
import { getLogoUrl } from './logos.ts'

describe('logos', () => {
  it('has an icon file for every insurer', () => {
    for (const insurer of INSURERS) {
      const url = getLogoUrl(insurer.id)
      assert.ok(url, `missing logo mapping for ${insurer.id}`)
      assert.ok(existsSync(`public${url}`), `missing file public${url}`)
    }
  })

  it('returns undefined for unknown insurers', () => {
    assert.equal(getLogoUrl('unknown'), undefined)
  })
})
