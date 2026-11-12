export type ChoiceQuestionCopy = {
  title: string
  description?: string
  help?: string
  yesLabel?: string
  noLabel?: string
}

/** Copy for the yes/no questions that split the journey after «Om deg». */
export const BRANCH_QUESTIONS = {
  hasInsurance: {
    title: 'Har du noen forsikringer i dag?',
    description: 'For eksempel innbo, bil eller reise. Det holder med én.',
    help: 'Har du forsikringer, kan vi sjekke hvor godt de passer deg. Har du ingen, finner vi en god match fra start.',
    yesLabel: 'Ja, det har jeg',
    noLabel: 'Nei, ikke ennå',
  },
  checkExisting: {
    title: 'Skal vi sjekke om de passer deg?',
    description: 'Du legger til forsikringsbeviset ditt, så ser vi hvor godt forsikringene dine passer det som betyr noe for deg.',
    help: 'Vi leser bare dokumentene du selv legger til. Vern selger ingenting, så du bestemmer helt selv hva du gjør etterpå.',
    yesLabel: 'Ja, sjekk dem',
    noLabel: 'Nei, ikke nå',
  },
  findNew: {
    title: 'Skal vi finne en ny match til deg?',
    description: 'Svar på noen korte spørsmål, så viser vi hvilke selskaper som passer deg best.',
    help: 'Vern er uavhengig og selger ingen forsikringer. Vi viser deg bare hva som passer. Svarer du nei, kommer du rett til profilen din.',
    yesLabel: 'Ja, finn en match',
    noLabel: 'Nei, ikke nå',
  },
} as const satisfies Record<string, ChoiceQuestionCopy>
