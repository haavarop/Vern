export type ChoiceQuestionCopy = {
  title: string
  description?: string
  yesLabel?: string
  noLabel?: string
}

/** Copy for the yes/no questions that split the journey after «Om deg». */
export const BRANCH_QUESTIONS = {
  hasInsurance: {
    title: 'Har du noen forsikringer i dag?',
    description: 'For eksempel innbo, bil eller reise. Det holder med én.',
    yesLabel: 'Ja, det har jeg',
    noLabel: 'Nei, ikke ennå',
  },
  checkExisting: {
    title: 'Skal vi sjekke om de passer deg?',
    yesLabel: 'Ja, sjekk dem',
    noLabel: 'Nei, ikke nå',
  },
  findNew: {
    title: 'Skal vi finne en ny match til deg?',
    description: 'Svar på noen korte spørsmål, så viser vi hvilke selskaper som passer deg best.',
    yesLabel: 'Ja, finn en match',
    noLabel: 'Nei, ikke nå',
  },
} as const satisfies Record<string, ChoiceQuestionCopy>
