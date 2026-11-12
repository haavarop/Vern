/**
 * Verdiprofil: kartlegger hva kunden verdsetter, slik at sammenligningen kan fremheve
 * relevante forskjeller i pris, dekning, hjelp og kundeopplevelse. Profilen supplerer
 * segmenteringen og plasserer ikke kunden i én fast type.
 */
export type Dimension = 'pris' | 'dekning' | 'hjelp' | 'enkelhet'

export const DIMENSIONS: Record<Dimension, { label: string; description: string; segments: string[] }> = {
  pris: {
    label: 'Pris og verdi',
    description: 'At du får mye for pengene.',
    segments: ['Verdi for pengene', 'Selvstyrere'],
  },
  dekning: {
    label: 'Dekning og trygghet',
    description: 'At forsikringen dekker mye, så du slipper overraskelser.',
    segments: ['Trygghetssøkende', 'Selvstyrere'],
  },
  hjelp: {
    label: 'Hjelp og tillit',
    description: 'At du får god hjelp når du trenger det.',
    segments: ['Tillitssøkende', 'Trygghetssøkende'],
  },
  enkelhet: {
    label: 'Enkelhet og kontroll',
    description: 'At det er lett å ordne og ha oversikt.',
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
    title: 'Hva er viktigst for deg?',
    help: 'Svaret hjelper oss å se hva du bryr deg mest om. Da kan vi vise deg det som passer.',
    options: [
      { label: 'Lav pris', weights: { pris: 1 } },
      { label: 'Bred dekning', weights: { dekning: 1 } },
      { label: 'Rask hjelp ved skade', weights: { hjelp: 1 } },
      { label: 'At alt er enkelt', weights: { enkelhet: 1 } },
    ],
  },
  {
    id: 'utsagn',
    title: 'Hva passer best for deg?',
    help: 'Ofte må du velge mellom pris og hvor mye du får. Her ser vi hva du helst vil ha.',
    options: [
      { label: 'Lavest mulig pris', weights: { pris: 1 } },
      { label: 'Litt av begge: pris og dekning', weights: { pris: 0.5, dekning: 0.5 } },
      { label: 'Gjerne litt dyrere, men bedre dekning', weights: { dekning: 1 } },
      { label: 'Gjerne litt dyrere, men bedre service', weights: { hjelp: 1 } },
    ],
  },
  {
    id: 'skade',
    title: 'Hvis noe skjer, hva vil du helst ha?',
    help: 'Det kan være en vannlekkasje eller en stjålet sykkel. Vi vil vite hva slags hjelp du liker.',
    options: [
      { label: 'At det går raskt, også utbetalingen', weights: { hjelp: 0.5, enkelhet: 0.5 } },
      { label: 'En person som hjelper meg hele veien', weights: { hjelp: 1 } },
      { label: 'At alt kan ordnes på mobilen', weights: { enkelhet: 1 } },
      { label: 'At jeg får riktig hjelp og riktig erstatning', weights: { dekning: 0.5, hjelp: 0.5 } },
    ],
  },
  {
    id: 'handtere',
    title: 'Hvordan vil du helst ordne forsikringene dine?',
    help: 'Noen vil bare ha det ordnet, andre vil sammenligne selv. Begge deler er helt greit.',
    options: [
      { label: 'Det skal bare fungere', weights: { enkelhet: 1 } },
      { label: 'Raskt og digitalt', weights: { enkelhet: 1 } },
      { label: 'Sammenligne og tilpasse selv', weights: { enkelhet: 0.5, pris: 0.5 } },
      { label: 'Få råd før jeg velger', weights: { hjelp: 1 } },
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
