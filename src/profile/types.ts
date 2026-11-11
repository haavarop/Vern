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

type Option = { label: string; weights: Partial<Record<Dimension, number>> }

/** One question = one slider. The options are the stops along the same line. */
export type Question = { id: string; title: string; help: string; options: Option[] }

export const QUESTIONS: Question[] = [
  {
    id: 'viktigst',
    title: 'Hva betyr mest for deg?',
    help: 'Vi bruker svaret til å forstå hva du prioriterer høyest på tvers av pris, dekning, hjelp og enkelhet.',
    options: [
      { label: 'Mest mulig for pengene', weights: { pris: 1 } },
      { label: 'God dekning', weights: { dekning: 1 } },
      { label: 'God og pålitelig hjelp', weights: { hjelp: 1 } },
      { label: 'Enkelt og oversiktlig', weights: { enkelhet: 1 } },
    ],
  },
  {
    id: 'utsagn',
    title: 'Hvilket utsagn passer best på deg?',
    help: 'Forsikring handler ofte om et kompromiss. Her ser vi hvordan du veier pris opp mot dekning og service.',
    options: [
      { label: 'Lavest mulig pris', weights: { pris: 1 } },
      { label: 'Balanse mellom pris og dekning', weights: { pris: 0.5, dekning: 0.5 } },
      { label: 'Betaler mer for bedre dekning', weights: { dekning: 1 } },
      { label: 'Betaler mer for bedre service', weights: { hjelp: 1 } },
    ],
  },
  {
    id: 'skade',
    title: 'Hvis du fikk en større skade, hva ville vært viktigst?',
    help: 'Her finner vi ut hva service og trygghet betyr konkret for deg når noe faktisk skjer.',
    options: [
      { label: 'Rask løsning og utbetaling', weights: { hjelp: 0.5, enkelhet: 0.5 } },
      { label: 'Personlig hjelp hele veien', weights: { hjelp: 1 } },
      { label: 'Enkelt og digitalt', weights: { enkelhet: 1 } },
      { label: 'Riktig hjelp og erstatning', weights: { dekning: 0.5, hjelp: 0.5 } },
    ],
  },
  {
    id: 'handtere',
    title: 'Hvordan vil du helst håndtere forsikringer?',
    help: 'Viser om du foretrekker bekvemmelighet, selvbetjening, kontroll eller rådgivning når du velger forsikring.',
    options: [
      { label: 'En løsning som bare fungerer', weights: { enkelhet: 1 } },
      { label: 'Raskt og digitalt', weights: { enkelhet: 1 } },
      { label: 'Selv sammenligne og tilpasse', weights: { enkelhet: 0.5, pris: 0.5 } },
      { label: 'Rådgiverhjelp ved valg', weights: { hjelp: 1 } },
    ],
  },
]

/** questionId → chosen option index, or null if not answered. */
export type Answers = Record<string, number | null>

export type UserProfile = { answers: Answers | null }

export function emptyAnswers(): Answers {
  return Object.fromEntries(QUESTIONS.map((q) => [q.id, null]))
}

export function isAnswered(answers: Answers | null): answers is Answers {
  return !!answers && Object.values(answers).some((v) => v !== null)
}

/**
 * Score per dimension, 0–100: the weight the chosen answers gave the dimension,
 * relative to the most it could have got from the answered questions.
 */
export function scoreProfile(answers: Answers): Record<Dimension, number> {
  const got = { pris: 0, dekning: 0, hjelp: 0, enkelhet: 0 }
  const max = { pris: 0, dekning: 0, hjelp: 0, enkelhet: 0 }
  for (const q of QUESTIONS) {
    const chosen = answers[q.id]
    if (chosen === null || chosen === undefined) continue
    for (const dim of DIMENSION_ORDER) {
      max[dim] += Math.max(...q.options.map((o) => o.weights[dim] ?? 0))
      got[dim] += q.options[chosen]?.weights[dim] ?? 0
    }
  }
  return Object.fromEntries(DIMENSION_ORDER.map((d) => [d, max[d] ? Math.round((got[d] / max[d]) * 100) : 0])) as Record<Dimension, number>
}

/** Dimensions sorted by score, highest first. */
export function rankDimensions(scores: Record<Dimension, number>): Dimension[] {
  return [...DIMENSION_ORDER].sort((a, b) => scores[b] - scores[a])
}
