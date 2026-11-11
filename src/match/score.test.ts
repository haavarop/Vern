import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreColor, scoreLabel } from './score.ts'

test('scoreColor grades from danger through warning to success', () => {
  assert.equal(scoreColor(0), 'var(--ax-bg-danger-strong)')
  assert.equal(scoreColor(60), 'color-mix(in oklab, var(--ax-bg-warning-strong) 100%, var(--ax-bg-danger-strong))')
  assert.equal(scoreColor(50), 'color-mix(in oklab, var(--ax-bg-warning-strong) 50%, var(--ax-bg-danger-strong))')
  assert.equal(scoreColor(70), 'color-mix(in oklab, var(--ax-bg-success-strong) 50%, var(--ax-bg-warning-strong))')
  assert.equal(scoreColor(90), 'var(--ax-bg-success-strong)')
})

test('scoreLabel uses inclusive thresholds', () => {
  assert.equal(scoreLabel(80), 'Svært god match')
  assert.equal(scoreLabel(79), 'God match')
  assert.equal(scoreLabel(65), 'God match')
  assert.equal(scoreLabel(50), 'Middels')
  assert.equal(scoreLabel(49), 'Svak match')
})
