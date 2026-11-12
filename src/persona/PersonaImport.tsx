import { useEffect, useRef, useState } from 'react'
import { BodyLong, BodyShort, Box, Button, Detail, Heading, HStack, LocalAlert, Tag, VStack } from '@navikt/ds-react'
import { ShieldCheckmarkIcon } from '@navikt/aksel-icons'
import { fetchValueProfileSuggestion } from './api.ts'
import { decodePersonaPass, type PersonaPass, type ValueProfileSuggestion } from './pass.ts'
import '../onboarding/onboarding.css'
import './persona.css'

type Props = {
  /** `suggestion` is null when the customer continues without Vern's suggested answers. */
  onImport: (pass: PersonaPass, suggestion: ValueProfileSuggestion | null) => void
  onCancel: () => void
}

/**
 * /persona#pass=…: shows what the customer chose to share from DigiU and asks before
 * Vern uses it. The pass arrives in the URL fragment, which the browser never sends to a server.
 */
export default function PersonaImport({ onImport, onCancel }: Props) {
  const [pass] = useState(() => decodePersonaPass(window.location.hash))
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)

  // Keep the shared traits out of the address bar and browser history once read.
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    return () => controller.current?.abort()
  }, [])

  async function accept(current: PersonaPass) {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setReading(true)
    setError('')
    try {
      const suggestion = await fetchValueProfileSuggestion(current, request.signal)
      if (!request.signal.aborted) onImport(current, suggestion)
    } catch (caught) {
      if (request.signal.aborted) return
      setReading(false)
      setError(caught instanceof Error ? caught.message : 'Noe gikk galt. Prøv igjen.')
    }
  }

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <HStack gap="space-8" align="center">
          <ShieldCheckmarkIcon aria-hidden fontSize="1.75rem" className="onboarding__logo" />
          <Heading level="2" size="small">Vern</Heading>
        </HStack>

        {!pass ? (
          <VStack gap="space-16">
            <HStack gap="space-8" align="center">
              <DigiUMark />
              <Heading level="1" size="large">Profil fra DigiU</Heading>
            </HStack>
            <LocalAlert status="error">
              <LocalAlert.Header>
                <LocalAlert.Title as="h2">Fant ingen gyldig DigiU-profil</LocalAlert.Title>
              </LocalAlert.Header>
              <LocalAlert.Content>
                <BodyShort>Lenken er ufullstendig eller utløpt. Åpne Vern på nytt fra DigiU.</BodyShort>
              </LocalAlert.Content>
            </LocalAlert>
          </VStack>
        ) : (
          <>
            <VStack gap="space-8">
              <HStack gap="space-4" align="center">
                <DigiUMark />
                <Detail textColor="subtle" weight="semibold" className="vp-eyebrow">Profil fra DigiU</Detail>
              </HStack>
              <Heading level="1" size="large">Hei, {pass.name}</Heading>
              <BodyLong>
                Du har valgt å dele dette med Vern. Vi bruker det til å foreslå svar i verdiprofilen og til å finne
                forsikringer som passer livet ditt, ikke bare prisen. Du kan endre alt underveis og slutte å dele når som helst.
              </BodyLong>
            </VStack>

            <Box as="section" aria-labelledby="persona-shared" background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
              <VStack gap="space-8">
                <Heading id="persona-shared" level="2" size="xsmall">Dette deler du ({pass.traits.length})</Heading>
                <PersonaTraits pass={pass} />
              </VStack>
            </Box>

            {error && (
              <LocalAlert status="warning">
                <LocalAlert.Header>
                  <LocalAlert.Title as="h2">Fikk ikke laget forslag</LocalAlert.Title>
                </LocalAlert.Header>
                <LocalAlert.Content>
                  <VStack gap="space-12" align="start">
                    <BodyShort>{error}</BodyShort>
                    <Button size="small" variant="secondary" onClick={() => onImport(pass, null)}>Fortsett uten forslag</Button>
                  </VStack>
                </LocalAlert.Content>
              </LocalAlert>
            )}
          </>
        )}
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          <Button variant="tertiary" onClick={() => { controller.current?.abort(); onCancel() }}>{pass ? 'Ikke nå' : 'Gå til Vern'}</Button>
          {pass && (
            <Button loading={reading} onClick={() => void accept(pass)}>
              {error ? 'Prøv igjen' : 'Bruk DigiU-profilen'}
            </Button>
          )}
        </div>
      </div>
      {reading && <BodyShort className="sr-only" role="status">Vern leser profilen din…</BodyShort>}
    </Box>
  )
}

/** DigiU's "U" mark. Decorative: DigiU's name is always in the text beside it. */
export function DigiUMark() {
  return (
    <svg aria-hidden viewBox="12 7 45 74" className="digiu-mark">
      <path d="M45.4073 25.9091H56.6321V60.3871C56.6321 64.2583 55.7075 67.6456 53.8583 70.549C52.0264 73.4524 49.46 75.7164 46.1591 77.3409C42.8582 78.9482 39.0129 79.7518 34.6232 79.7518C30.2163 79.7518 26.3623 78.9482 23.0614 77.3409C19.7605 75.7164 17.1941 73.4524 15.3622 70.549C13.5303 67.6456 12.6143 64.2583 12.6143 60.3871V25.9091H23.8391V59.4279C23.8391 61.4499 24.2798 63.2473 25.1612 64.82C26.0599 66.3926 27.3215 67.6283 28.946 68.527C30.5705 69.4257 32.4629 69.875 34.6232 69.875C36.8008 69.875 38.6932 69.4257 40.3004 68.527C41.925 67.6283 43.1779 66.3926 44.0593 64.82C44.958 63.2473 45.4073 61.4499 45.4073 59.4279V25.9091Z" />
      <ellipse cx="23" cy="14.5" rx="7" ry="6.5" />
      <ellipse cx="47" cy="14.5" rx="7" ry="6.5" />
    </svg>
  )
}

export function PersonaTraits({ pass }: { pass: PersonaPass }) {
  return (
    <ul className="persona-traits">
      {pass.traits.map((trait) => (
        <li key={`${trait.category}:${trait.value}`} className="persona-trait">
          <Tag size="xsmall" variant="moderate" data-color="neutral">{trait.category}</Tag>
          <BodyShort size="small" lang="en">{trait.value}</BodyShort>
        </li>
      ))}
    </ul>
  )
}
