type Slice = { label: string; value: number; color: string }

/** Ring segment from angle a0 to a1 (radians, 0 = 12 o'clock), outer radius R, inner radius r. */
function arc(a0: number, a1: number, R: number, r: number) {
  const p = (a: number, rad: number) => `${(50 + Math.sin(a) * rad).toFixed(3)} ${(50 - Math.cos(a) * rad).toFixed(3)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${p(a0, R)} A ${R} ${R} 0 ${large} 1 ${p(a1, R)} L ${p(a1, r)} A ${r} ${r} 0 ${large} 0 ${p(a0, r)} Z`
}

/**
 * Donut with a big centre value. Decorative; the legend next to it carries the data for screen readers.
 * Every slice gets a 1px forest outline, so light slices (mint, cream) still stand out from the card.
 */
export function DonutChart({ slices, centerValue, centerLabel, size = 200 }: { slices: Slice[]; centerValue: string; centerLabel: string; size?: number }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1
  const full = Math.PI * 2
  // Start angle of each slice = sum of the slices before it.
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((sum, s) => sum + (s.value / total) * full, 0))
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="chart-donut" aria-hidden>
      {slices.map((slice, i) => {
        const a0 = starts[i]
        const end = a0 + (slice.value / total) * full
        // A single full slice can't be drawn as one arc; split it in two halves.
        const d = slices.length === 1 ? `${arc(0, Math.PI, 46, 34)} ${arc(Math.PI, full, 46, 34)}` : arc(a0, end, 46, 34)
        return <path key={slice.label + i} d={d} fill={slice.color} className="chart-donut__slice" />
      })}
      <text x="50" y="51" textAnchor="middle" className="chart-donut__value">{centerValue}</text>
      <text x="50" y="62" textAnchor="middle" className="chart-donut__label">{centerLabel}</text>
    </svg>
  )
}

/** Radar chart for 0–100 scores. */
export function RadarChart({ axes, size = 300 }: { axes: { label: string; value: number; highlight?: boolean }[]; size?: number }) {
  const n = axes.length
  const point = (i: number, radius: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius] as const
  }
  const polygon = (radius: (i: number) => number) => axes.map((_, i) => point(i, radius(i)).join(',')).join(' ')
  return (
    <svg viewBox="-48 -10 196 118" width={size} height={size * 118 / 196} className="chart-radar" aria-hidden>
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
