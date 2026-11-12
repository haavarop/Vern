import { getInsurer } from './insurers.ts'
import type { Policy, Segment } from './types.ts'

type Product = { name: string; min: number; max: number; coverage?: string }

const CATALOGUE: Record<Segment, Product[]> = {
  skade: [
    { name: 'Bilforsikring', min: 450, max: 1100 },
    { name: 'Innboforsikring', min: 150, max: 400 },
    { name: 'Husforsikring', min: 350, max: 900 },
    { name: 'Hytteforsikring', min: 200, max: 600 },
    { name: 'Personforsikring (ulykke)', min: 80, max: 250 },
  ],
  liv: [
    { name: 'Livsforsikring', min: 100, max: 600 },
    { name: 'Uføreforsikring', min: 150, max: 500 },
    { name: 'Kritisk sykdom', min: 100, max: 350 },
  ],
  pensjon: [
    { name: 'Innskuddspensjon (EPK)', min: 0, max: 0, coverage: 'Arbeidsgiverbetalt' },
    { name: 'IPS', min: 250, max: 1500 },
  ],
  helse: [{ name: 'Behandlingsforsikring', min: 250, max: 700 }],
  reise: [{ name: 'Reiseforsikring (helårs)', min: 90, max: 250 }],
  dyr: [
    { name: 'Hundeforsikring', min: 250, max: 700 },
    { name: 'Katteforsikring', min: 120, max: 350 },
  ],
  baat: [{ name: 'Båtforsikring', min: 150, max: 800 }],
  landbruk: [{ name: 'Gårdsforsikring', min: 800, max: 2500 }],
  rettshjelp: [{ name: 'Rettshjelpsforsikring', min: 60, max: 180 }],
}

const COVERAGES = ['Super', 'Pluss', 'Standard', 'Kasko', 'Basis']
const BASE_DATE = Date.UTC(2026, 0, 1)
const DAY_MS = 24 * 60 * 60 * 1000

/** FNV-1a 32-bit. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * Deterministic demo policies per insurer. Demo quirk: `jbf` always returns no
 * policies, to show the empty state.
 */
export function generatePolicies(insurerId: string): Policy[] {
  const insurer = getInsurer(insurerId)
  if (!insurer) throw new Error(`Unknown insurer: ${insurerId}`)
  if (insurer.id === 'jbf') return []

  const rng = mulberry32(hashString(insurer.id))
  const pool = insurer.segments.flatMap((segment) => CATALOGUE[segment].map((product) => ({ segment, product })))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const count = Math.min(pool.length, randomInt(rng, 1, 4))
  const prefix = insurer.id.replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase()

  return pool.slice(0, count).map(({ segment, product }, index) => ({
    id: `${insurer.id}-${index + 1}`,
    insurerId: insurer.id,
    insurer: insurer.name,
    product: product.name,
    category: segment,
    premium: Math.round(product.min + rng() * (product.max - product.min)),
    coverage: product.coverage ?? COVERAGES[randomInt(rng, 0, COVERAGES.length - 1)],
    policyNumber: `${prefix}-${String(randomInt(rng, 0, 9_999_999)).padStart(7, '0')}`,
    renewalDate: new Date(BASE_DATE + randomInt(rng, 30, 365) * DAY_MS).toISOString().slice(0, 10),
  }))
}

const REFERENCE_COLOURS = ['BLÅ', 'GRØNN', 'RØD', 'GUL', 'HVIT', 'SORT', 'LILLA', 'ORANSJE']
const REFERENCE_ANIMALS = ['ELG', 'REV', 'ULV', 'GAUPE', 'HARE', 'ØRN', 'ORRE', 'BJØRN']

/** Deterministic reference words shown during simulated app confirmation, e.g. "BLÅ ELG 42". */
export function referenceWords(seed: string): string {
  const rng = mulberry32(hashString(`ref:${seed}`))
  const colour = REFERENCE_COLOURS[randomInt(rng, 0, REFERENCE_COLOURS.length - 1)]
  const animal = REFERENCE_ANIMALS[randomInt(rng, 0, REFERENCE_ANIMALS.length - 1)]
  return `${colour} ${animal} ${randomInt(rng, 10, 99)}`
}
