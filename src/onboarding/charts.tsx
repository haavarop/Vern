
import { CHART_COLORS } from './chartColors.ts'

type Slice = { label: string; value: number }

/** Donut with a big centre value. Decorative; the legend next to it carries the data for screen readers. */
export function DonutChart({ slices, centerValue, centerLabel, size = 160 }: { slices: Slice[]; centerValue: string; centerLabel: string; size?: number }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1
  const r = 40
  const c = 2 * Math.PI * r
  // Start offset of each slice = sum of the slices before it.
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((sum, s) => sum + (s.value / total) * c, 0))
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="chart-donut" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ax-bg-neutral-moderate)" strokeWidth="12" />
      {slices.map((slice, i) => {
        const length = (slice.value / total) * c
        return (
          <circle key={slice.label + i} cx="50" cy="50" r={r} fill="none" stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth="12"
            strokeDasharray={`${Math.max(length - 1, 0)} ${c}`} strokeDashoffset={-starts[i]} transform="rotate(-90 50 50)" />
        )
      })}
      <text x="50" y="49" textAnchor="middle" className="chart-donut__value">{centerValue}</text>
      <text x="50" y="62" textAnchor="middle" className="chart-donut__label">{centerLabel}</text>
    </svg>
  )
}

/** Radar chart for 0–100 scores. */
export function RadarChart({ axes, size = 240 }: { axes: { label: string; value: number; highlight?: boolean }[]; size?: number }) {
  const n = axes.length
  const point = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius] as const
  }
  const polygon = (radius: (i: number) => number) => axes.map((_, i) => point(i, radius(i)).join(',')).join(' ')
  return (
    <svg viewBox="-22 -8 144 116" width={size} height={size * 116 / 144} className="chart-radar" aria-hidden>
      {[0.25, 0.5, 0.75, 1].map((step) => (
        <polygon key={step} points={polygon(() => 40 * step)} className="chart-radar__grid" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 40)
        return <line key={i} x1="50" y1="50" x2={x} y2={y} className="chart-radar__grid" />
      })}
      <polygon points={polygon((i) => (40 * Math.max(axes[i].value, 4)) / 100)} className="chart-radar__area" />
      {axes.map((axis, i) => {
        const [x, y] = point(i, (40 * Math.max(axis.value, 4)) / 100)
        const [lx, ly] = point(i, 50)
        return (
          <g key={axis.label}>
            <circle cx={x} cy={y} r="2.4" className="chart-radar__dot" />
            <text x={lx} y={ly + 1.5} textAnchor={Math.abs(lx - 50) < 1 ? 'middle' : lx > 50 ? 'start' : 'end'}
              className={`chart-radar__label${axis.highlight ? ' is-top' : ''}`}>{axis.label}</text>
          </g>
        )
      })}
    </svg>
  )
}
