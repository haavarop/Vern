import type { Insurer, Segment } from './types.ts'

export const SEGMENT_LABELS: Record<Segment, string> = {
  skade: 'Skade',
  liv: 'Liv',
  pensjon: 'Pensjon',
  helse: 'Helse',
  reise: 'Reise',
  dyr: 'Dyr',
  baat: 'Båt',
  landbruk: 'Landbruk',
  rettshjelp: 'Rettshjelp',
}

/*
 * Consumer-facing Norwegian insurers, one entry per brand. Distributing banks and
 * former brand names are aliases so search still finds them.
 *
 * Deliberately excluded (needs human verification):
 * - Protector Forsikring: mainly B2B (commercial, public, change-of-ownership via brokers).
 * - Codan (now Tryg), Sbanken (DNB, products via Fremtind), Bulder (via Frende),
 *   Danske Bank / Danica (Danica Pensjon acquired by Storebrand 2018): kept as aliases.
 * - Insr Insurance (believed in run-off), Vardia (ceased), Silver Pensjonsforsikring
 *   (under administration 2017).
 * - Instabank, OBOS, Talkmore, Rema 1000/Æ, car-brand insurance (Tesla, Volvia, etc.):
 *   distributors/white-label products underwritten by the companies below.
 * - "Matmor": no such Norwegian insurer could be identified.
 * - Oslo Pensjonsforsikring, Telenor Forsikring: captive/municipal, not open to consumers.
 */
const RAW_INSURERS: Insurer[] = [
  { id: 'gjensidige', name: 'Gjensidige', description: 'Norges største skadeforsikringsselskap', segments: ['skade', 'liv', 'pensjon', 'helse', 'reise', 'dyr', 'baat'], aliases: ['Gjensidige Pensjon'] },
  { id: 'if', name: 'If', description: 'Nordisk skadeforsikring for privatpersoner', segments: ['skade', 'helse', 'reise', 'dyr', 'baat'], aliases: ['If Skadeforsikring'] },
  { id: 'tryg', name: 'Tryg', description: 'Skadeforsikring, inkl. tidligere Codan-kunder', segments: ['skade', 'helse', 'reise', 'dyr', 'baat'], aliases: ['Codan', 'Tryg Forsikring'], verify: 'Codan Norway was merged into Tryg (around 2021–22). Confirm that Codan should appear only as an alias.' },
  { id: 'fremtind', name: 'Fremtind', description: 'Forsikring via SpareBank 1, DNB og Eika', segments: ['skade', 'liv', 'helse', 'reise', 'dyr', 'baat'], aliases: ['SpareBank 1', 'DNB', 'Sbanken', 'Eika', 'Eika Forsikring'], verify: 'The Eika Forsikring → Fremtind merger (announced 2024) may now be complete. If it is not, split Eika into its own entry.' },
  { id: 'eika', name: 'Eika Forsikring', description: 'Forsikring via lokale sparebanker i Eika-alliansen', segments: ['skade', 'reise', 'dyr'], aliases: ['Eika', 'lokalbank'], verify: 'Remove if it is fully merged into Fremtind. Keep it until confirmed.' },
  { id: 'storebrand', name: 'Storebrand', description: 'Skade, liv og pensjon', segments: ['skade', 'liv', 'pensjon', 'helse', 'reise'], aliases: ['Storebrand Livsforsikring', 'Danica'] },
  { id: 'klp', name: 'KLP', description: 'Pensjon for offentlig ansatte, skade for medlemmer', segments: ['skade', 'liv', 'pensjon'], aliases: ['KLP Skadeforsikring'] },
  { id: 'frende', name: 'Frende Forsikring', description: 'Skade og liv via regionale sparebanker', segments: ['skade', 'liv', 'reise', 'dyr', 'baat'], aliases: ['Frende Livsforsikring', 'Bulder', 'Bulder Forsikring', 'Sparebanken Norge', 'Sparebanken Vest'], verify: 'Verify current ownership and brand. The Bulder Forsikring brand is distributed via Frende.' },
  { id: 'dnb-liv', name: 'DNB Livsforsikring', description: 'Pensjonssparing og livsforsikring i DNB', segments: ['liv', 'pensjon'], aliases: ['DNB Liv', 'DNB Pensjon'] },
  { id: 'nordea-liv', name: 'Nordea Liv', description: 'Pensjon og livsforsikring i Nordea', segments: ['liv', 'pensjon'], aliases: ['Nordea Livsforsikring'] },
  { id: 'sparebank1-forsikring', name: 'SpareBank 1 Forsikring', description: 'Tjenestepensjon og pensjonssparing i SpareBank 1', segments: ['pensjon'], aliases: ['SpareBank 1 Pensjon'], verify: 'Individual life moved to Fremtind, and pension may remain here.' },
  { id: 'nordnet-liv', name: 'Nordnet Livsforsikring', description: 'Pensjonssparing (IPS, EPK) via Nordnet', segments: ['pensjon'], aliases: ['Nordnet'], verify: 'Verify that it is relevant to consumers.' },
  { id: 'help', name: 'Help Forsikring', description: 'Rettshjelpsforsikring for privatpersoner', segments: ['rettshjelp'], aliases: ['Help'] },
  { id: 'landkreditt', name: 'Landkreditt Forsikring', description: 'Forsikring for landbruk og bygdefolk', segments: ['skade', 'landbruk'], aliases: ['Landkreditt'] },
  { id: 'agria', name: 'Agria Dyreforsikring', description: 'Forsikring for hund, katt og hest', segments: ['dyr'], aliases: ['Agria'] },
  { id: 'europeiske', name: 'Europeiske Reiseforsikring', description: 'Spesialist på reiseforsikring', segments: ['reise'], aliases: ['ERV'], verify: 'Verify current owner and brand. It may be part of If or Gjensidige.' },
  { id: 'watercircles', name: 'WaterCircles Forsikring', description: 'Båt- og bilforsikring på nett', segments: ['baat', 'skade'], aliases: ['WaterCircles'], verify: 'Verify that it is still active.' },
  { id: 'enter', name: 'Enter Forsikring', description: 'Digital bilforsikring', segments: ['skade'], aliases: ['Enter'], verify: 'Verify that it is still active and who owns it.' },
  { id: 'ly', name: 'Ly Forsikring', description: 'Digitalt forsikringsselskap for privatpersoner', segments: ['skade', 'reise'], aliases: ['Ly'], verify: 'Verify that it is still active.' },
  { id: 'nemi', name: 'NEMI Forsikring', description: 'Nisjeforsikring, ofte via samarbeidspartnere', segments: ['skade', 'dyr'], aliases: ['NEMI'], verify: 'Verify consumer relevance. It is mostly sold via partners.' },
  { id: 'jbf', name: 'Jernbanepersonalets forsikring', description: 'Gjensidig selskap for jernbaneansatte', segments: ['skade'], aliases: ['JBF'], verify: 'Verify. It is membership-limited.' },
]

export const INSURERS: readonly Insurer[] = [...RAW_INSURERS].sort((a, b) => a.name.localeCompare(b.name, 'nb'))

const INSURERS_BY_ID = new Map(INSURERS.map((insurer) => [insurer.id, insurer]))

export function getInsurer(id: string): Insurer | undefined {
  return INSURERS_BY_ID.get(id)
}

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

export function searchInsurers(query: string): Insurer[] {
  const needle = normalize(query)
  return INSURERS.filter((insurer) => {
    if (!needle) return true
    const haystack = [insurer.name, insurer.description, ...(insurer.aliases ?? []), ...insurer.segments.map((s) => SEGMENT_LABELS[s])]
    return haystack.some((value) => normalize(value).includes(needle))
  })
}

const LEGAL_SUFFIXES = /\b(asa|as|ab|nuf|skadeforsikring|forsikring|forsikringsselskap|norge|norway)\b/g

function companyKey(value: string): string {
  return normalize(value).replace(/[.,]/g, ' ').replace(LEGAL_SUFFIXES, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Finds a known insurer from a company name as written in a document, e.g. "Gjensidige Forsikring ASA" → Gjensidige.
 * Legal suffixes like "Forsikring ASA" are ignored.
 */
export function findInsurerByName(name: string): Insurer | undefined {
  const key = companyKey(name)
  if (!key) return undefined
  const names = (insurer: Insurer) => [insurer.name, insurer.legalName ?? '', ...(insurer.aliases ?? [])].map(companyKey).filter(Boolean)
  return INSURERS.find((insurer) => names(insurer).includes(key)) ??
    INSURERS.find((insurer) => names(insurer).some((candidate) => key.startsWith(`${candidate} `)))
}
