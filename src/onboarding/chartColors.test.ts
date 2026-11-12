import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHART_COLORS, groupForChart, OTHER_LABEL } from './chartColors.ts'

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, label: `P${i}`, value: (i + 1) * 100 }))

function assertNeighboursDiffer(colors: string[]) {
  for (let i = 0; i < colors.length; i++) {
    if (colors.length > 1) assert.notEqual(colors[i], colors[(i + 1) % colors.length])
  }
}

test('gives every item its own colour while there are enough', () => {
  const groups = groupForChart(items(CHART_COLORS.length))
  assert.equal(new Set(groups.map((g) => g.color)).size, CHART_COLORS.length)
  assertNeighboursDiffer(groups.map((g) => g.color))
})

test('groups the smallest items as "Andre" when there are more items than colours', () => {
  const groups = groupForChart(items(CHART_COLORS.length + 2))
  assert.equal(groups.length, CHART_COLORS.length)
  const other = groups.at(-1)!
  assert.equal(other.label, OTHER_LABEL)
  assert.deepEqual(other.ids.sort(), ['p0', 'p1', 'p2'])
  assert.equal(other.value, 600)
  assertNeighboursDiffer(groups.map((g) => g.color))
})
