/**
 * Verdiprofil: kartlegger hva kunden verdsetter, slik at sammenligningen kan fremheve
 * relevante forskjeller i pris, dekning, hjelp og kundeopplevelse. Profilen supplerer
 * segmenteringen og plasserer ikke kunden i én fast type.
 */
export type Dimension = 'pris' | 'dekning' | 'hjelp' | 'enkelhet'

export const DIMENSIONS: Record<Dimension, { label: string; description: string; segments: string[] }> = {
  pris: {
    label: 'Pris og verdi',
    description: 'Lav pris, balanse eller tydelig merverdi.',
    segments: ['Verdi for pengene', 'Selvstyrere'],
  },
  dekning: {
    label: 'Dekning og trygghet',
    description: 'Behovet for bred dekning og færre uforutsette utgifter.',
    segments: ['Trygghetssøkende', 'Selvstyrere'],
  },
  hjelp: {
    label: 'Hjelp og tillit',
    description: 'Forventninger til støtte, rådgivning og skadebehandling.',
    segments: ['Tillitssøkende', 'Trygghetssøkende'],
  },
  enkelhet: {
    label: 'Enkelhet og kontroll',
    description: 'Ønske om bekvemmelighet, selvbetjening, rådgivning eller kontroll.',
    segments: ['Ubekymrede', 'Enkelhetssøkende', 'Selvstyrere'],
  },
}

export const DIMENSION_ORDER: Dimension[] = ['pris', 'dekning', 'hjelp', 'enkelhet']

type Option = { id: string; label: string; weights: Partial<Record<Dimension, number>> }
export type Question = { id: string; title: string; hint: string; scale: [string, string]; options: Option[] }

export const QUESTIONS: Question[] = [
  {
    id: 'viktigst',
    title: 'Hva betyr mest for deg?',
    hint: 'Dra opp det som er viktigst for deg – gjerne to ting tydelig høyere enn resten.',
    scale: ['Lite viktig', 'Svært viktig'],
    options: [
      { id: 'penger', label: 'Mest mulig for pengene', weights: { pris: 1 } },
      { id: 'dekning', label: 'God dekning', weights: { dekning: 1 } },
      { id: 'hjelp', label: 'God og pålitelig hjelp', weights: { hjelp: 1 } },
      { id: 'enkelt', label: 'Enkelt og oversiktlig', weights: { enkelhet: 1 } },
    ],
  },
  {
    id: 'utsagn',
    title: 'Hvilket utsagn passer best på deg?',
    hint: 'Hvor godt passer hvert utsagn?',
    scale: ['Passer ikke', 'Passer godt'],
    options: [
      { id: 'lavest', label: 'Lavest mulig pris', weights: { pris: 1 } },
      { id: 'balanse', label: 'Balanse mellom pris og dekning', weights: { pris: 0.5, dekning: 0.5 } },
      { id: 'merdekning', label: 'Betaler mer for bedre dekning', weights: { dekning: 1 } },
      { id: 'merservice', label: 'Betaler mer for bedre service', weights: { hjelp: 1 } },
    ],
  },
  {
    id: 'skade',
    title: 'Hvis du fikk en større skade, hva ville vært viktigst?',
    hint: 'Tenk deg at uhellet er ute. Hva trenger du da?',
    scale: ['Lite viktig', 'Svært viktig'],
    options: [
      { id: 'rask', label: 'Rask løsning og utbetaling', weights: { hjelp: 0.5, enkelhet: 0.5 } },
      { id: 'personlig', label: 'Personlig hjelp hele veien', weights: { hjelp: 1 } },
      { id: 'digitalt', label: 'Enkelt og digitalt', weights: { enkelhet: 1 } },
      { id: 'erstatning', label: 'Riktig hjelp og erstatning', weights: { dekning: 0.5, hjelp: 0.5 } },
    ],
  },
  {
    id: 'handtere',
    title: 'Hvordan vil du helst håndtere forsikringer?',
    hint: 'Hvor godt passer hver måte for deg?',
    scale: ['Passer ikke', 'Passer godt'],
    options: [
      { id: 'fungerer', label: 'En løsning som bare fungerer', weights: { enkelhet: 1 } },
      { id: 'raskdigital', label: 'Raskt og digitalt', weights: { enkelhet: 1 } },
      { id: 'selv', label: 'Selv sammenligne og tilpasse', weights: { enkelhet: 0.5, pris: 0.5 } },
      { id: 'radgiver', label: 'Rådgiverhjelp ved valg', weights: { hjelp: 1 } },
    ],
  },
]

export const SCALE_MAX = 4
export const SCALE_DEFAULT = 2
export const SCALE_LABELS = ['Ikke i det hele tatt', 'Litt', 'Middels', 'Mye', 'Svært mye']

/** questionId → optionId → 0..SCALE_MAX */
export type Answers = Record<string, Record<string, number>>

export type UserProfile = { answers: Answers | null }

export function defaultAnswers(): Answers {
  return Object.fromEntries(QUESTIONS.map((q) => [q.id, Object.fromEntries(q.options.map((o) => [o.id, SCALE_DEFAULT]))]))
}

/** Score per dimension, 0–100. */
export function scoreProfile(answers: Answers): Record<Dimension, number> {
  const sum = { pris: 0, dekning: 0, hjelp: 0, enkelhet: 0 }
  const max = { pris: 0, dekning: 0, hjelp: 0, enkelhet: 0 }
  for (const q of QUESTIONS) {
    for (const o of q.options) {
      const value = answers[q.id]?.[o.id] ?? SCALE_DEFAULT
      for (const [dim, w] of Object.entries(o.weights) as [Dimension, number][]) {
        sum[dim] += value * w
        max[dim] += SCALE_MAX * w
      }
    }
  }
  return Object.fromEntries(DIMENSION_ORDER.map((d) => [d, max[d] ? Math.round((sum[d] / max[d]) * 100) : 0])) as Record<Dimension, number>
}

/** Dimensions sorted by score, highest first. */
export function rankDimensions(scores: Record<Dimension, number>): Dimension[] {
  return [...DIMENSION_ORDER].sort((a, b) => scores[b] - scores[a])
}
