export type Segment = 'skade' | 'liv' | 'pensjon' | 'helse' | 'reise' | 'dyr' | 'baat' | 'landbruk' | 'rettshjelp'

export type Insurer = {
  id: string
  name: string
  legalName?: string
  description: string
  segments: Segment[]
  aliases?: string[]
  /** Human-verification note. Dev only, never rendered. */
  verify?: string
}

/** One coverage line from the policy certificate, e.g. "Ansvar · 5 000 000 · egenandel 4 000". */
export type CoverageLine = {
  name: string
  /** Insured amount / limit in NOK, if stated. */
  sumInsured?: number
  /** Deductible in NOK, if stated as a number. */
  deductible?: number
  /** Free-text deductible or limit note when it isn't a plain number (e.g. "4 000 + 20 %"). */
  note?: string
}

export type Policy = {
  id: string
  insurerId: string
  insurer: string
  product: string
  category: Segment
  /** NOK per month */
  premium: number
  coverage?: string
  policyNumber: string
  /** ISO date (YYYY-MM-DD). Empty string if unknown. */
  renewalDate: string

  // Fields below are filled in when the policy comes from an uploaded insurance document.
  /** NOK per year, as stated in the document. */
  annualPremium?: number
  /** Main deductible (egenandel) in NOK. */
  deductible?: number
  /** Main insured amount (forsikringssum) in NOK, e.g. innbosum. */
  sumInsured?: number
  /** ISO date the current period starts. */
  validFrom?: string
  /** Covered items with limits and deductibles. */
  coverages?: CoverageLine[]
  /** Short list of important exclusions (Dekkes ikke). */
  exclusions?: string[]
  /** Other notable terms worth comparing (payout rules, safety requirements, recent changes). */
  notes?: string[]
  source?: PolicySource
}

export type PolicySource = {
  type: 'document'
  fileName: string
  /** ISO date the document was issued, if stated. */
  issuedAt?: string
  /** ISO timestamp of the analysis. */
  analyzedAt: string
}

/** Connected insurers keyed by insurer id, in connection order. */
export type ConnectionState = Record<string, Policy[]>
