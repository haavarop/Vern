import type { Policy } from './types.ts'

export type DocumentAnalysis = { policies: Policy[]; warnings: string[] }

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024

/** Sends the PDF to the server, which extracts the text and lets the AI turn it into policies. Nothing is stored. */
export async function analyzeDocument(file: File, fetcher: typeof fetch = fetch): Promise<DocumentAnalysis> {
  let response: Response
  try {
    response = await fetcher(`/api/documents/analyze?filnavn=${encodeURIComponent(file.name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: file,
    })
  } catch {
    throw new Error('Fikk ikke kontakt med tjenesten. Prøv igjen.')
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
      ? data.error : 'Kunne ikke analysere dokumentet. Prøv igjen.')
  }
  if (!data || typeof data !== 'object' || !('policies' in data) || !Array.isArray(data.policies)) {
    throw new Error('Fikk et ugyldig svar fra analysen. Prøv igjen.')
  }
  const warnings = 'warnings' in data && Array.isArray(data.warnings) ? data.warnings.filter((w): w is string => typeof w === 'string') : []
  return { policies: data.policies as Policy[], warnings }
}
