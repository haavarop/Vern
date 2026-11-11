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
  /** ISO date (YYYY-MM-DD) */
  renewalDate: string
}

/** Connected insurers keyed by insurer id, in connection order. */
export type ConnectionState = Record<string, Policy[]>
