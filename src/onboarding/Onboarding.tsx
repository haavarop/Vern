import { useState } from 'react'
import { Alert, BodyLong, Box, Button, Detail, FileUpload, Heading, HStack, List, ReadMore, VStack } from '@navikt/ds-react'
import { ArrowLeftIcon, ShieldCheckmarkIcon } from '@navikt/aksel-icons'
import PolicySummary from './PolicySummary.tsx'
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
  fileType: 'Filen må være en PDF.',
  fileSize: 'Filen er større enn 15 MB.',
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
      .catch((error: unknown) => update(id, { status: 'error', error: error instanceof Error ? error.message : 'Kunne ikke analysere dokumentet.' }))
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
    if (upload.status === 'analyzing') return 'Leser dokumentet … dette kan ta opptil et minutt'
    if (upload.status === 'done') return `Fant ${policyCountLabel(upload.policyIds.length)}`
    return undefined
  }

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <HStack gap="space-8" align="center" justify="space-between">
          <HStack gap="space-8" align="center">
            <ShieldCheckmarkIcon aria-hidden fontSize="1.75rem" className="onboarding__logo" />
            <Heading level="2" size="small">Vern</Heading>
          </HStack>
          <Detail textColor="subtle">Profil · steg 2 av 2</Detail>
        </HStack>

        <VStack gap="space-8">
          <Heading level="1" size="large">Last opp forsikringene dine</Heading>
          <BodyLong>
            Last opp forsikringsdokumentet fra selskapet ditt. Vi leser ut pris, dekninger og egenandeler, så vi kan sammenligne med andre selskaper.
          </BodyLong>
        </VStack>

        <Box as="section" aria-labelledby="documents-heading" background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
          <VStack gap="space-16">
            <Heading id="documents-heading" level="2" size="xsmall">Forsikringsdokumenter</Heading>
            <FileUpload.Dropzone
              label="Last opp forsikringsdokument"
              description="PDF, maks 15 MB. Du kan laste opp flere dokumenter."
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
              <VStack as="ul" gap="space-8" className="upload-list" aria-label="Opplastede dokumenter">
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

            <ReadMore header="Hvor finner jeg forsikringsdokumentet?" size="small">
              Logg inn på «Min side» hos forsikringsselskapet ditt og last ned forsikringsbeviset eller forsikringsoversikten som PDF.
              Du får det også tilsendt på e-post eller i digital postkasse når forsikringen fornyes.
            </ReadMore>
            <Detail textColor="subtle">
              Dokumentet analyseres med Gjensidiges KI-tjeneste og lagres ikke. Vi tar bare vare på forsikringsopplysningene, ikke navn eller adresse.
            </Detail>
          </VStack>
        </Box>

        {allPolicies.length > 0 && (
          <VStack gap="space-12">
            <Alert variant="info" size="small">
              <VStack gap="space-4">
                <span>Sjekk at opplysningene stemmer. Dokumentet er lest automatisk og kan inneholde feil.</span>
                {warnings.length > 0 && (
                  <List as="ul" size="small">
                    {warnings.map((warning, index) => <List.Item key={index}>{warning}</List.Item>)}
                  </List>
                )}
              </VStack>
            </Alert>
            <PolicySummary
              connections={connections}
              onRemovePolicy={(policy) => setConnections((current) => removePolicies(current, [policy.id]))}
            />
          </VStack>
        )}
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          {onBack && <Button variant="tertiary" icon={<ArrowLeftIcon aria-hidden />} onClick={onBack}>Tilbake</Button>}
          <Button variant="tertiary" onClick={onSkip} disabled={analyzing}>Hopp over</Button>
          <Button disabled={allPolicies.length === 0 || analyzing} loading={analyzing} onClick={() => onDone(connections)}>
            {allPolicies.length ? `Fortsett med ${policyCountLabel(allPolicies.length)}` : 'Fortsett'}
          </Button>
        </div>
      </div>
    </Box>
  )
}
