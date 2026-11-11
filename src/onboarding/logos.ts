/** Insurer id → file extension of its icon in public/insurers/. Icons are the companies' own site icons. */
const LOGO_EXTENSIONS: Record<string, string> = {
  gjensidige: 'png',
  if: 'png',
  tryg: 'png',
  fremtind: 'png',
  eika: 'svg',
  storebrand: 'png',
  klp: 'png',
  frende: 'png',
  'dnb-liv': 'svg',
  'nordea-liv': 'png',
  'sparebank1-forsikring': 'png',
  'nordnet-liv': 'svg',
  help: 'png',
  landkreditt: 'svg',
  agria: 'svg',
  europeiske: 'jpg',
  watercircles: 'png',
  enter: 'png',
  ly: 'png',
  nemi: 'svg',
  jbf: 'svg',
}

export function getLogoUrl(insurerId: string): string | undefined {
  const extension = LOGO_EXTENSIONS[insurerId]
  return extension && `/insurers/${insurerId}.${extension}`
}
