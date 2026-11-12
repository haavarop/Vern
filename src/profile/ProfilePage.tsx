import { BodyLong, BodyShort, Box, Button, Detail, Heading, HStack, Tag, VStack } from '@navikt/ds-react'
import { Buildings2Icon, PencilIcon, PersonCircleIcon, PlusIcon, ShieldCheckmarkIcon, StarIcon } from '@navikt/aksel-icons'
import PolicySummary from '../onboarding/PolicySummary.tsx'
import type { ConnectionState } from '../onboarding/types.ts'
import { PersonaTraits } from '../persona/PersonaImport.tsx'
import type { PersonaPass } from '../persona/pass.ts'
import { DIMENSIONS, rankDimensions, scoreProfile, type UserProfile } from './types.ts'
import '../onboarding/onboarding.css'
import './profile.css'

type Props = {
  connections: ConnectionState
  profile: UserProfile
  /** Traits shared from The Digital You, if any. */
  persona: PersonaPass | null
  /** Forgets the Persona Pass: Vern stops using the traits. */
  onStopSharing: () => void
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
          <BodyShort textColor="subtle">
            Svar på fire korte spørsmål, så fremhever vi forskjellene som betyr mest for deg.
          </BodyShort>
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
    <VStack gap="space-12">
      <BodyLong>
        Du vektlegger mest <strong>{DIMENSIONS[top[0]].label.toLowerCase()}</strong> og{' '}
        <strong>{DIMENSIONS[top[1]].label.toLowerCase()}</strong>.
      </BodyLong>
      <HStack gap="space-8" wrap>
        {segments.map((s) => <Tag key={s} size="small" variant="info">{s}</Tag>)}
      </HStack>
      <ul className="vp-dims">
        {ranked.map((dim) => (
          <li key={dim} className={`vp-dim${top.includes(dim) ? ' vp-dim--top' : ''}`}>
            <HStack justify="space-between" align="baseline" gap="space-8" wrap={false}>
              <div>
                <BodyShort weight="semibold">{DIMENSIONS[dim].label}</BodyShort>
                <Detail textColor="subtle">{DIMENSIONS[dim].description}</Detail>
              </div>
              <BodyShort weight="semibold" className="vp-dim__score">{scores[dim]}</BodyShort>
            </HStack>
            <div className="vp-dim__bar" role="meter" aria-label={DIMENSIONS[dim].label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={scores[dim]}>
              <span style={{ width: `${scores[dim]}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <Detail textColor="subtle">Profilen plasserer deg ikke i én fast type – den hjelper oss å vise det som er relevant for deg.</Detail>
      <Button variant="secondary" icon={<PencilIcon aria-hidden />} onClick={onEdit} className="onboarding__add">Endre svar</Button>
    </VStack>
  )
}

function PersonaSection({ persona, onStopSharing }: { persona: PersonaPass; onStopSharing: () => void }) {
  return (
    <Box as="section" aria-labelledby="persona-heading" background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
      <VStack gap="space-12">
        <HStack justify="space-between" align="center" gap="space-8">
          <Heading id="persona-heading" level="2" size="xsmall">Persona Pass</Heading>
          <Tag size="small" variant="moderate" data-color="success">Delt fra {persona.issuer}</Tag>
        </HStack>
        <BodyShort>
          Du deler {persona.traits.length} egenskaper med Vern. Vi bruker dem til å finne forsikringer som passer livet ditt, ikke bare prisen.
        </BodyShort>
        <PersonaTraits pass={persona} />
        <Button variant="secondary" onClick={onStopSharing} className="onboarding__add">Slutt å dele</Button>
      </VStack>
    </Box>
  )
}

export default function ProfilePage({ connections, profile, persona, onStopSharing, onAddInsurers, onEditProfile, onReset, onContinue, continueLabel = 'Gå til Vern', onShowMatches }: Props) {
  const hasConnections = Object.keys(connections).length > 0

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <HStack gap="space-8" align="center">
          <ShieldCheckmarkIcon aria-hidden fontSize="1.75rem" className="onboarding__logo" />
          <Heading level="2" size="small">Vern</Heading>
        </HStack>

        <VStack gap="space-8">
          <Heading level="1" size="large">Din profil</Heading>
          <BodyLong>Oversikt over forsikringene dine og hva som er viktigst for deg.</BodyLong>
        </VStack>

        <Box as="section" aria-labelledby="values-heading" background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
          <VStack gap="space-12">
            <HStack justify="space-between" align="center">
              <Heading id="values-heading" level="2" size="xsmall">Verdiprofil</Heading>
              {!profile.answers && <Tag size="small" variant="neutral">Ikke satt</Tag>}
            </HStack>
            <ValueProfile profile={profile} onEdit={onEditProfile} />
          </VStack>
        </Box>

        {persona && <PersonaSection persona={persona} onStopSharing={onStopSharing} />}

        <VStack gap="space-12" as="section" aria-labelledby="policies-heading">
          <Heading id="policies-heading" level="2" size="xsmall">Dine forsikringer</Heading>
          {hasConnections ? (
            <PolicySummary connections={connections} />
          ) : (
            <Box background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
              <HStack gap="space-12" align="center" wrap={false} className="connected-empty">
                <Buildings2Icon aria-hidden fontSize="2rem" />
                <BodyShort textColor="subtle">Ingen forsikringer hentet ennå.</BodyShort>
              </HStack>
            </Box>
          )}
          <Button variant="secondary" icon={<PlusIcon aria-hidden />} onClick={onAddInsurers} className="onboarding__add">
            Legg til forsikringsselskap
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
