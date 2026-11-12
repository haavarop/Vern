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
 * /persona#pass=…: shows what the customer chose to share from The Digital You and asks before
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
            <Heading level="1" size="large">Persona Pass</Heading>
            <LocalAlert status="error">
              <LocalAlert.Header>
                <LocalAlert.Title as="h2">Fant ingen gyldig Persona Pass</LocalAlert.Title>
              </LocalAlert.Header>
              <LocalAlert.Content>
                <BodyShort>Lenken er ufullstendig eller utløpt. Åpne Vern på nytt fra The Digital You.</BodyShort>
              </LocalAlert.Content>
            </LocalAlert>
          </VStack>
        ) : (
          <>
            <VStack gap="space-8">
              <Detail textColor="subtle" weight="semibold" className="vp-eyebrow">Persona Pass fra {pass.issuer}</Detail>
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
              {error ? 'Prøv igjen' : 'Bruk Persona Pass'}
            </Button>
          )}
        </div>
      </div>
      {reading && <BodyShort className="sr-only" role="status">Vern leser profilen din…</BodyShort>}
    </Box>
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
