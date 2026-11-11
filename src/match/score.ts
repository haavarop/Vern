// Colour stops: danger at/below 40, warning at 60, success at/above 80 (matches scoreLabel bands).
const STOPS = [
  { at: 40, color: 'var(--ax-bg-danger-strong)' },
  { at: 60, color: 'var(--ax-bg-warning-strong)' },
  { at: 80, color: 'var(--ax-bg-success-strong)' },
]

/** Fill colour graded red → yellow → green. Built from Aksel tokens so it adapts to light and dark theme. */
export function scoreColor(score: number): string {
  if (score <= STOPS[0].at) return STOPS[0].color
  for (let i = 1; i < STOPS.length; i++) {
    const from = STOPS[i - 1]
    const to = STOPS[i]
    if (score <= to.at) {
      const share = Math.round(((score - from.at) / (to.at - from.at)) * 100)
      return `color-mix(in oklab, ${to.color} ${share}%, ${from.color})`
    }
  }
  return STOPS[STOPS.length - 1].color
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Svært god match'
  if (score >= 65) return 'God match'
  if (score >= 50) return 'Middels'
  return 'Svak match'
}
