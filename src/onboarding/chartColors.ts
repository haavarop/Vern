/**
 * Chart palette from the Vern brand primitives only. Neighbours always differ, also across the
 * seam between the last and first slice. Apricot is kept out on purpose; it is reserved for match moments.
 */
export const CHART_COLORS = [
  'var(--vern-forest)',
  'var(--vern-mint)',
  'var(--vern-charcoal)',
  'var(--vern-cream)',
  'var(--vern-grey)',
]

export const OTHER_LABEL = 'Andre'

export type ChartItem = { id: string; label: string; value: number }
export type ChartGroup = { label: string; value: number; color: string; ids: string[] }

/**
 * Gives each item its own colour. With more items than colours, the largest keep their own
 * slice and the rest are grouped as "Andre", so no two neighbouring slices share a colour.
 */
export function groupForChart(items: ChartItem[]): ChartGroup[] {
  if (items.length <= CHART_COLORS.length) {
    return items.map((item, i) => ({ label: item.label, value: item.value, color: CHART_COLORS[i], ids: [item.id] }))
  }
  const sorted = [...items].sort((a, b) => b.value - a.value)
  const own = sorted.slice(0, CHART_COLORS.length - 1)
  const rest = sorted.slice(CHART_COLORS.length - 1)
  return [
    ...own.map((item, i) => ({ label: item.label, value: item.value, color: CHART_COLORS[i], ids: [item.id] })),
    { label: OTHER_LABEL, value: rest.reduce((sum, item) => sum + item.value, 0), color: CHART_COLORS[CHART_COLORS.length - 1], ids: rest.map((item) => item.id) },
  ]
}
