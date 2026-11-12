/**
 * Verdiprofil: kartlegger hva kunden verdsetter, slik at sammenligningen kan fremheve
 * relevante forskjeller i pris, dekning, hjelp og kundeopplevelse. Profilen supplerer
 * segmenteringen og plasserer ikke kunden i én fast type.
 */
export type Dimension = 'pris' | 'dekning' | 'hjelp' | 'enkelhet'

export const DIMENSIONS: Record<Dimension, { label: string; title: string; description: string; segments: string[] }> = {
  pris: {
    label: 'Pris og verdi',
    title: 'Hva du vil betale',
    description: 'Hvor viktig pris er for deg, og hvor mye du er villig til å betale for ekstra verdi.',
    segments: ['Verdi for pengene', 'Selvstyrere'],
  },
  dekning: {
    label: 'Dekning og trygghet',
    title: 'Hva du vil være dekket for',
    description: 'Hvor omfattende forsikring og vilkår du ønsker.',
    segments: ['Trygghetssøkende', 'Selvstyrere'],
  },
  hjelp: {
    label: 'Hjelp og tillit',
    title: 'God hjelp og service',
    description: 'Hvor godt selskapet følger deg opp og hjelper deg når du trenger det.',
    segments: ['Tillitssøkende', 'Trygghetssøkende'],
  },
  enkelhet: {
    label: 'Enkelhet og kontroll',
    title: 'Hva du vil ordne digitalt',
    description: 'Hvor viktig det er for deg å kunne finne informasjon, endre forsikringer og melde skade på nett.',
    segments: ['Ubekymrede', 'Enkelhetssøkende', 'Selvstyrere'],
  },
}

export const DIMENSION_ORDER: Dimension[] = ['pris', 'dekning', 'hjelp', 'enkelhet']

type Option = { label: string; weights: Partial<Record<Dimension, number>> }

/** One question = one slider. The options are the stops along the same line. `pick` makes it multiple choice: the customer picks exactly that many. */
export type Question = { id: string; title: string; options: Option[]; pick?: number }

export const QUESTIONS: Question[] = [
  {
    id: 'viktigst',
    title: 'Hva er viktigst for deg når du velger forsikring?',
    options: [
      { label: 'Lavest mulig pris, selv om jeg får færre dekninger', weights: { pris: 1 } },
      { label: 'God balanse mellom pris og dekning', weights: { pris: 0.5, dekning: 0.5 } },
      { label: 'Høy dekning, selv om det koster mer i måneden', weights: { dekning: 1 } },
    ],
  },
  {
    id: 'forventning',
    title: 'Hva er viktigst for deg når du velger forsikringsselskap?',
    pick: 2,
    options: [
      { label: 'Rask skadebehandling og god hjelp når jeg trenger det', weights: { hjelp: 1 } },
      { label: 'En god pris, som passer budsjettet mitt', weights: { pris: 1 } },
      { label: 'Enkel digital selvbetjening, slik at jeg kan ordne det meste selv', weights: { enkelhet: 1 } },
      { label: 'God dekning, slik at jeg er godt sikret hvis noe skjer', weights: { dekning: 1 } },
    ],
  },
  {
    id: 'skade',
    title: 'Hva ville bekymret deg mest hvis du får en skade?',
    options: [
      { label: 'At jeg må betale en høy egenandel', weights: { pris: 1 } },
      { label: 'At forsikringen min ikke dekker skaden', weights: { dekning: 1 } },
      { label: 'At jeg ikke får den hjelpen jeg trenger', weights: { hjelp: 1 } },
      { label: 'At det tar lang tid å behandle skadesaken', weights: { hjelp: 0.5, enkelhet: 0.5 } },
    ],
  }
]

/** questionId → chosen option index (or indexes, for multiple choice), or null if not answered. */
export type Answer = number | number[]
export type Answers = Record<string, Answer | null>

export type UserProfile = { answers: Answers | null }

export function emptyAnswers(): Answers {
  return Object.fromEntries(QUESTIONS.map((q) => [q.id, null]))
}

export function isAnswered(answers: Answers | null): answers is Answers {
  return !!answers && Object.values(answers).some((v) => v !== null)
}

export function chosenOptions(answer: Answer | null | undefined): number[] {
  if (answer === null || answer === undefined) return []
  return Array.isArray(answer) ? answer : [answer]
}

/** A single-choice question needs one answer; a multiple-choice question needs exactly `pick`. */
export function isComplete(question: Question, answer: Answer | null | undefined): boolean {
  return chosenOptions(answer).length === (question.pick ?? 1)
}

/**
 * Score per dimension, 0–100: the weight the chosen answers gave the dimension,
 * relative to the most it could have got from the answered questions.
 */
export function scoreProfile(answers: Answers): Record<Dimension, number> {
  const got = { pris: 0, dekning: 0, hjelp: 0, enkelhet: 0 }
  const max = { pris: 0, dekning: 0, hjelp: 0, enkelhet: 0 }
  for (const q of QUESTIONS) {
    const chosen = chosenOptions(answers[q.id])
    if (chosen.length === 0) continue
    for (const dim of DIMENSION_ORDER) {
      const best = q.options.map((o) => o.weights[dim] ?? 0).sort((a, b) => b - a)
      max[dim] += best.slice(0, q.pick ?? 1).reduce((sum, w) => sum + w, 0)
      got[dim] += chosen.reduce((sum, i) => sum + (q.options[i]?.weights[dim] ?? 0), 0)
    }
  }
  return Object.fromEntries(DIMENSION_ORDER.map((d) => [d, max[d] ? Math.round((got[d] / max[d]) * 100) : 0])) as Record<Dimension, number>
}

/** Dimensions sorted by score, highest first. */
export function rankDimensions(scores: Record<Dimension, number>): Dimension[] {
  return [...DIMENSION_ORDER].sort((a, b) => scores[b] - scores[a])
}
