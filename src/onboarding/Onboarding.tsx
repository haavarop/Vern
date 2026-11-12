import { useState } from 'react'
import { BodyLong, BodyShort, Box, Button, Detail, FileUpload, Heading, HStack, List, ReadMore, VStack } from '@navikt/ds-react'
import { ArrowLeft, CircleCheck, Lock } from 'lucide-react'
import PolicySummary from './PolicySummary.tsx'
import VernHeader from './VernHeader.tsx'
import { analyzeDocument, MAX_DOCUMENT_BYTES } from './documentApi.ts'
import { policyCountLabel } from './format.ts'
import type { ConnectionState, Policy } from './types.ts'
import './onboarding.css'

type Props = { onDone: (connections: ConnectionState) => void; onSkip: () => void; onBack?: () => void; initialConnections?: ConnectionState }

type Upload = {
  id: string
  file: File
  status: 'analyzing' | 'done' | 'error'
  error?: string
  /** Rejected before upload (wrong type/size). Can't be retried, only removed. */
  rejected?: boolean
  policyIds: string[]
  warnings: string[]
}

const REJECTION_MESSAGES: Record<string, string> = {
  fileType: 'Vi kan bare lese PDF. Last ned forsikringsbeviset som PDF, og prøv igjen.',
  fileSize: 'Filen er større enn 15 MB. Prøv en mindre fil, for eksempel bare forsikringsbeviset.',
}

function addPolicies(connections: ConnectionState, policies: Policy[]): ConnectionState {
  const next = { ...connections }
  for (const policy of policies) next[policy.insurerId] = [...(next[policy.insurerId] ?? []), policy]
  return next
}

function removePolicies(connections: ConnectionState, ids: string[]): ConnectionState {
  const next: ConnectionState = {}
  for (const [insurerId, policies] of Object.entries(connections)) {
    const kept = policies.filter((policy) => !ids.includes(policy.id))
    if (kept.length) next[insurerId] = kept
  }
  return next
}

export default function Onboarding({ onDone, onSkip, onBack, initialConnections = {} }: Props) {
  const [connections, setConnections] = useState<ConnectionState>(initialConnections)
  const [uploads, setUploads] = useState<Upload[]>([])

  const allPolicies = Object.values(connections).flat()
  const analyzing = uploads.some((upload) => upload.status === 'analyzing')
  const warnings = uploads.flatMap((upload) => upload.warnings)

  function update(id: string, patch: Partial<Upload>) {
    setUploads((current) => current.map((upload) => (upload.id === id ? { ...upload, ...patch } : upload)))
  }

  function start(file: File) {
    const id = crypto.randomUUID()
    setUploads((current) => [...current, { id, file, status: 'analyzing', policyIds: [], warnings: [] }])
    analyzeDocument(file)
      .then(({ policies, warnings: found }) => {
        setConnections((current) => addPolicies(current, policies))
        update(id, { status: 'done', policyIds: policies.map((policy) => policy.id), warnings: found })
      })
      .catch((error: unknown) => update(id, { status: 'error', error: error instanceof Error ? error.message : 'Vi fikk ikke lest dokumentet. Prøv igjen.' }))
  }

  function removeUpload(upload: Upload) {
    setConnections((current) => removePolicies(current, upload.policyIds))
    setUploads((current) => current.filter((item) => item.id !== upload.id))
  }

  function retry(upload: Upload) {
    setUploads((current) => current.filter((item) => item.id !== upload.id))
    start(upload.file)
  }

  function describe(upload: Upload): string | undefined {
    if (upload.status === 'analyzing') return 'Vi leser dokumentet …'
    if (upload.status === 'done') {
      return upload.policyIds.length ? `Vi fant ${policyCountLabel(upload.policyIds.length)}` : 'Vi fant ingen forsikringer her'
    }
    return undefined
  }

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <VernHeader><Detail textColor="subtle">Del 2 av 2</Detail></VernHeader>

        <VStack gap="space-8">
          <Heading level="1" size="large">Hvilke forsikringer har du i dag?</Heading>
          <BodyLong>
            Legg til forsikringsbeviset ditt som PDF. Vi leser ut hva du betaler, hva som dekkes og hva du betaler selv ved en skade.
          </BodyLong>
        </VStack>

        <section aria-label="Forsikringsbevis" className="vern-card">
          <VStack gap="space-16">
            <FileUpload.Dropzone
              label="Legg til forsikringsbevis"
              description="PDF, opptil 15 MB. Du kan legge til flere."
              accept="application/pdf,.pdf"
              maxSizeInBytes={MAX_DOCUMENT_BYTES}
              multiple
              onSelect={(files) => {
                for (const selected of files) {
                  if (selected.error) {
                    const reason = selected.reasons.map((r) => REJECTION_MESSAGES[r] ?? r).join(' ')
                    setUploads((current) => [...current, { id: crypto.randomUUID(), file: selected.file, status: 'error', error: reason, rejected: true, policyIds: [], warnings: [] }])
                  } else {
                    start(selected.file)
                  }
                }
              }}
            />

            {uploads.length > 0 && (
              <VStack as="ul" gap="space-8" className="upload-list" aria-label="Dokumentene du har lagt til">
                {uploads.map((upload) => (
                  <FileUpload.Item
                    as="li"
                    key={upload.id}
                    file={upload.file}
                    status={upload.status === 'analyzing' ? 'uploading' : 'idle'}
                    description={describe(upload)}
                    error={upload.error}
                    button={upload.status === 'analyzing' ? undefined : upload.status === 'error' && !upload.rejected
                      ? { action: 'retry', onClick: () => retry(upload) }
                      : { action: 'delete', onClick: () => removeUpload(upload) }}
                  />
                ))}
              </VStack>
            )}

            <HStack gap="space-12" align="start" wrap={false} className="upload-privacy">
              <Lock aria-hidden size={24} />
              <BodyShort size="small">
                Vi leser dokumentet for å finne forsikringene dine. Vi lagrer bare forsikringene vi finner, ikke selve dokumentet.
              </BodyShort>
            </HStack>

            <ReadMore header="Hvor finner jeg forsikringsbeviset?" size="small">
              Logg inn på «Min side» hos forsikringsselskapet ditt. Der kan du som regel laste ned forsikringsbeviset som PDF.
            </ReadMore>
          </VStack>
        </section>

        {allPolicies.length > 0 && (
          <VStack gap="space-16">
            <Box className="vern-status-positive" role="status">
              <HStack gap="space-12" align="start" wrap={false}>
                <CircleCheck aria-hidden size={24} className="upload-status__icon" />
                <VStack gap="space-4">
                  <BodyShort weight="semibold">Fint! Vi fant {policyCountLabel(allPolicies.length)}.</BodyShort>
                  <BodyShort size="small">Ta en rask titt og se at tallene stemmer. Er noe feil, kan du fjerne forsikringen og prøve igjen.</BodyShort>
                  {warnings.length > 0 && (
                    <List as="ul" size="small">
                      {warnings.map((warning, index) => <List.Item key={index}>{warning}</List.Item>)}
                    </List>
                  )}
                </VStack>
              </HStack>
            </Box>
            <PolicySummary
              connections={connections}
              onRemovePolicy={(policy) => setConnections((current) => removePolicies(current, [policy.id]))}
            />
          </VStack>
        )}
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions cta-bar__actions--stack">
          {onBack && <Button variant="tertiary" icon={<ArrowLeft size="1em" aria-hidden />} onClick={onBack}>Tilbake</Button>}
          <Button variant="tertiary" onClick={onSkip} disabled={analyzing}>Hopp over</Button>
          <Button disabled={allPolicies.length === 0 || analyzing} loading={analyzing} onClick={() => onDone(connections)}>
            {allPolicies.length ? `Fortsett med ${policyCountLabel(allPolicies.length)}` : 'Fortsett'}
          </Button>
        </div>
      </div>
    </Box>
  )
}
