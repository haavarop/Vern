import { BodyShort, Box, Button, Heading, HStack, Tag, VStack } from '@navikt/ds-react'
import { Buildings2Icon, PencilIcon, PersonCircleIcon, ShieldCheckmarkIcon, StarIcon, UploadIcon } from '@navikt/aksel-icons'
import PolicySummary from '../onboarding/PolicySummary.tsx'
import type { ConnectionState } from '../onboarding/types.ts'
import { RadarChart } from '../onboarding/charts.tsx'
import { DIMENSION_ORDER, DIMENSIONS, rankDimensions, scoreProfile, type Dimension, type UserProfile } from './types.ts'

const SHORT_LABELS: Record<Dimension, string> = { pris: 'Pris', dekning: 'Dekning', hjelp: 'Hjelp', enkelhet: 'Enkelhet' }
import '../onboarding/onboarding.css'
import './profile.css'

type Props = {
  connections: ConnectionState
  profile: UserProfile
  onAddInsurers: () => void
  onEditProfile: () => void
  /** Deletes the stored profile and restarts onboarding as a new customer. */
  onReset: () => void
  onContinue: () => void
  continueLabel?: string
  /** Shown as a secondary action once the user has seen their matches. */
  onShowMatches?: () => void
}

function ValueProfile({ profile, onEdit }: { profile: UserProfile; onEdit: () => void }) {
  if (!profile.answers) {
    return (
      <VStack gap="space-12">
        <HStack gap="space-12" align="center" wrap={false} className="connected-empty">
          <PersonCircleIcon aria-hidden fontSize="2rem" />
          <BodyShort textColor="subtle">Fire korte spørsmål om hva du bryr deg om.</BodyShort>
        </HStack>
        <Button variant="primary" onClick={onEdit} className="onboarding__add">Lag verdiprofil</Button>
      </VStack>
    )
  }

  const scores = scoreProfile(profile.answers)
  const ranked = rankDimensions(scores)
  const top = ranked.slice(0, 2)
  const segments = [...new Set(top.flatMap((d) => DIMENSIONS[d].segments))]

  return (
    <HStack gap="space-24" align="center" wrap className="vp-summary">
      <RadarChart axes={DIMENSION_ORDER.map((dim) => ({ label: SHORT_LABELS[dim], value: scores[dim], highlight: top.includes(dim) }))} />
      <VStack gap="space-12" className="vp-summary__side">
        <VStack as="ol" gap="space-4" className="vp-rank" aria-label="Det som er viktigst for deg">
          {ranked.map((dim, index) => (
            <li key={dim} className={top.includes(dim) ? 'is-top' : undefined}>
              <span className="vp-rank__num" aria-hidden>{index + 1}</span>
              <BodyShort size="small" weight={top.includes(dim) ? 'semibold' : 'regular'}>{DIMENSIONS[dim].label}</BodyShort>
              <BodyShort size="small" textColor="subtle" className="vp-rank__score">{scores[dim]}</BodyShort>
            </li>
          ))}
        </VStack>
        <HStack gap="space-4" wrap>
          {segments.map((s) => <Tag key={s} size="small" variant="info-moderate">{s}</Tag>)}
        </HStack>
        <Button variant="tertiary" size="small" icon={<PencilIcon aria-hidden />} onClick={onEdit}>Endre svar</Button>
      </VStack>
    </HStack>
  )
}

export default function ProfilePage({ connections, profile, onAddInsurers, onEditProfile, onReset, onContinue, continueLabel = 'Gå til Vern', onShowMatches }: Props) {
  const hasConnections = Object.keys(connections).length > 0

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <HStack gap="space-8" align="center">
          <ShieldCheckmarkIcon aria-hidden fontSize="1.75rem" className="onboarding__logo" />
          <Heading level="2" size="small">Vern</Heading>
        </HStack>

        <Heading level="1" size="large">Din profil</Heading>

        <Box as="section" aria-labelledby="values-heading" background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
          <VStack gap="space-12">
            <HStack justify="space-between" align="center">
              <Heading id="values-heading" level="2" size="xsmall">Verdiprofil</Heading>
              {!profile.answers && <Tag size="small" variant="neutral">Ikke satt</Tag>}
            </HStack>
            <ValueProfile profile={profile} onEdit={onEditProfile} />
          </VStack>
        </Box>

        <VStack gap="space-12" as="section" aria-labelledby="policies-heading">
          <Heading id="policies-heading" level="2" size="xsmall">Dine forsikringer</Heading>
          {hasConnections ? (
            <PolicySummary connections={connections} />
          ) : (
            <Box background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
              <HStack gap="space-12" align="center" wrap={false} className="connected-empty">
                <Buildings2Icon aria-hidden fontSize="2rem" />
                <BodyShort textColor="subtle">Ingen forsikringer lastet opp ennå.</BodyShort>
              </HStack>
            </Box>
          )}
          <Button variant="secondary" icon={<UploadIcon aria-hidden />} onClick={onAddInsurers} className="onboarding__add">
            Last opp forsikringsdokument
          </Button>
        </VStack>
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          <Button variant="tertiary" onClick={() => { if (window.confirm('Slette profilen og starte på nytt?')) onReset() }}>Start på nytt</Button>
          {onShowMatches && <Button variant="secondary" icon={<StarIcon aria-hidden />} onClick={onShowMatches}>Se matcher</Button>}
          <Button onClick={onContinue}>{continueLabel}</Button>
        </div>
      </div>
    </Box>
  )
}
