import { BodyShort, Box, Button, Detail, Heading, HStack, Tag, VStack } from '@navikt/ds-react'
import { CircleUser, FileText, Pencil, Star, Upload } from 'lucide-react'
import PolicySummary from '../onboarding/PolicySummary.tsx'
import VernHeader from '../onboarding/VernHeader.tsx'
import type { ConnectionState } from '../onboarding/types.ts'
import { RadarChart } from '../onboarding/charts.tsx'
import { DIMENSION_ORDER, DIMENSIONS, rankDimensions, scoreProfile, type Dimension, type UserProfile } from './types.ts'
import '../onboarding/onboarding.css'
import './profile.css'

const SHORT_LABELS: Record<Dimension, string> = { pris: 'Pris', dekning: 'Dekning', hjelp: 'Hjelp', enkelhet: 'Enkelhet' }

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
      <VStack gap="space-16">
        <HStack gap="space-12" align="center" wrap={false} className="connected-empty">
          <CircleUser aria-hidden size={32} />
          <BodyShort textColor="subtle">Svar på fire korte spørsmål, så vet vi hva du bryr deg om.</BodyShort>
        </HStack>
        <Button variant="primary" onClick={onEdit} className="onboarding__add">Svar på spørsmålene</Button>
      </VStack>
    )
  }

  const scores = scoreProfile(profile.answers)
  const ranked = rankDimensions(scores)
  const top = ranked.slice(0, 2)

  return (
    <VStack gap="space-16">
      <BodyShort>
        Det viktigste for deg er <strong>{DIMENSIONS[top[0]].label.toLowerCase()}</strong>, og deretter{' '}
        <strong>{DIMENSIONS[top[1]].label.toLowerCase()}</strong>.
      </BodyShort>
      <HStack gap="space-24" align="center" wrap className="vp-summary">
        <RadarChart axes={DIMENSION_ORDER.map((dim) => ({ label: SHORT_LABELS[dim], value: scores[dim], highlight: top.includes(dim) }))} />
        <VStack gap="space-12" className="vp-summary__side">
          <VStack as="ol" gap="space-8" className="vp-rank" aria-label="Det som er viktigst for deg, fra mest til minst">
            {ranked.map((dim, index) => (
              <li key={dim} className={top.includes(dim) ? 'is-top' : undefined}>
                <span className="vp-rank__num" aria-hidden>{index + 1}</span>
                <BodyShort size="small" weight={top.includes(dim) ? 'semibold' : 'regular'}>{DIMENSIONS[dim].label}</BodyShort>
                <BodyShort size="small" textColor="subtle" className="vp-rank__score">{scores[dim]}</BodyShort>
              </li>
            ))}
          </VStack>
          <Detail textColor="subtle">Dette er ingen fasit. Det hjelper oss bare å vise deg det som passer.</Detail>
          <div>
            <Button variant="tertiary" size="small" icon={<Pencil size="1em" aria-hidden />} onClick={onEdit}>Endre svarene</Button>
          </div>
        </VStack>
      </HStack>
    </VStack>
  )
}

export default function ProfilePage({ connections, profile, onAddInsurers, onEditProfile, onReset, onContinue, continueLabel = 'Se forslagene dine', onShowMatches }: Props) {
  const hasConnections = Object.keys(connections).length > 0

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <VernHeader />

        <VStack gap="space-8">
          <Heading level="1" size="large">Profilen din</Heading>
          <BodyShort textColor="subtle">Her ser du det som betyr noe for deg, og forsikringene du har i dag.</BodyShort>
        </VStack>

        <section aria-labelledby="values-heading" className="vern-card">
          <VStack gap="space-16">
            <HStack justify="space-between" align="center" gap="space-8">
              <Heading id="values-heading" level="2" size="small">Det som betyr noe for deg</Heading>
              {!profile.answers && <Tag size="small" variant="neutral">Ikke svart ennå</Tag>}
            </HStack>
            <ValueProfile profile={profile} onEdit={onEditProfile} />
          </VStack>
        </section>

        <VStack gap="space-16" as="section" aria-labelledby="policies-heading">
          <Heading id="policies-heading" level="2" size="small">Forsikringene dine</Heading>
          {hasConnections ? (
            <PolicySummary connections={connections} collapsible />
          ) : (
            <div className="vern-card">
              <HStack gap="space-12" align="center" wrap={false} className="connected-empty">
                <FileText aria-hidden size={32} />
                <BodyShort textColor="subtle">Du har ikke lagt til noen forsikringer ennå. Det tar bare et par minutter.</BodyShort>
              </HStack>
            </div>
          )}
          <Button variant="secondary" icon={<Upload size="1em" aria-hidden />} onClick={onAddInsurers} className="onboarding__add">
            Legg til forsikringsbevis
          </Button>
        </VStack>
      </VStack>

      <div className="cta-bar cta-bar--static">
        <div className="cta-bar__actions cta-bar__actions--stack">
          <Button variant="tertiary" onClick={() => { if (window.confirm('Vil du begynne på nytt? Svarene og forsikringene du har lagt til, blir slettet.')) onReset() }}>Begynn på nytt</Button>
          {onShowMatches && <Button variant="secondary" icon={<Star size="1em" aria-hidden />} onClick={onShowMatches}>Se matchene dine</Button>}
          <Button onClick={onContinue}>{continueLabel}</Button>
        </div>
      </div>
    </Box>
  )
}
