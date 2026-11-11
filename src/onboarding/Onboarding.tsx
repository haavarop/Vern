import { useCallback, useState } from 'react'
import { BodyLong, BodyShort, Box, Button, Detail, Heading, HStack, VStack } from '@navikt/ds-react'
import { ArrowLeftIcon, Buildings2Icon, PlusIcon, ShieldCheckmarkIcon } from '@navikt/aksel-icons'
import InsurerPickerModal from './InsurerPickerModal.tsx'
import Monogram from './Monogram.tsx'
import PolicySummary from './PolicySummary.tsx'
import { formatKr, policyCountLabel, sumPremium } from './format.ts'
import { getInsurer } from './insurers.ts'
import type { ConnectionState, Policy } from './types.ts'
import './onboarding.css'

type Props = { onDone: (connections: ConnectionState) => void; onSkip: () => void; onBack?: () => void; initialConnections?: ConnectionState }

export default function Onboarding({ onDone, onSkip, onBack, initialConnections = {} }: Props) {
  const [connections, setConnections] = useState<ConnectionState>(initialConnections)
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleConnected = useCallback((insurerId: string, policies: Policy[]) => {
    setConnections((current) => ({ ...current, [insurerId]: policies }))
  }, [])

  function remove(insurerId: string) {
    setConnections(({ [insurerId]: _removed, ...rest }) => rest)
  }

  const entries = Object.entries(connections)
  const allPolicies = entries.flatMap(([, policies]) => policies)

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
          <Heading level="1" size="large">Hent forsikringene dine</Heading>
          <BodyLong>
            Koble til selskapene du har forsikring hos. Vi henter avtalene dine og viser om du betaler for mye.
          </BodyLong>
        </VStack>

        <Box as="section" aria-labelledby="connected-heading" background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
          <VStack gap="space-12">
            <Heading id="connected-heading" level="2" size="xsmall">Tilkoblede selskaper</Heading>
            {entries.length === 0 ? (
              <HStack gap="space-12" align="center" wrap={false} className="connected-empty">
                <Buildings2Icon aria-hidden fontSize="2rem" />
                <BodyShort textColor="subtle">Ingen selskaper er koblet til ennå. Legg til ett eller flere for å se forsikringene dine.</BodyShort>
              </HStack>
            ) : (
              <ul role="list" className="connected-list">
                {entries.map(([insurerId, policies]) => {
                  const name = getInsurer(insurerId)?.name ?? insurerId
                  return (
                    <li key={insurerId} className="connected-list__row">
                      <Monogram id={insurerId} name={name} size="small" />
                      <div className="connected-list__text">
                        <BodyShort weight="semibold">{name}</BodyShort>
                        <Detail textColor="subtle">{policyCountLabel(policies.length)} · {formatKr(sumPremium(policies))}/mnd</Detail>
                      </div>
                      <Button variant="tertiary" size="small" className="touch-target" onClick={() => remove(insurerId)} aria-label={`Fjern ${name}`}>Fjern</Button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Button variant={entries.length ? 'secondary' : 'primary'} icon={<PlusIcon aria-hidden />} onClick={() => setPickerOpen(true)} className="onboarding__add">
              Legg til forsikringsselskap
            </Button>
          </VStack>
        </Box>

        {entries.length > 0 && <PolicySummary connections={connections} />}
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          {onBack && <Button variant="tertiary" icon={<ArrowLeftIcon aria-hidden />} onClick={onBack}>Tilbake</Button>}
          <Button variant="tertiary" onClick={onSkip}>Hopp over</Button>
          <Button disabled={entries.length === 0} onClick={() => onDone(connections)}>
            {allPolicies.length ? `Fortsett med ${policyCountLabel(allPolicies.length)}` : 'Fortsett'}
          </Button>
        </div>
      </div>

      <InsurerPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        connections={connections}
        onConnected={handleConnected}
      />
    </Box>
  )
}
