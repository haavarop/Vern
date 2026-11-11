import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from 'react'
import { BodyLong, BodyShort, Box, Button, Detail, Heading, HStack, InfoCard, Loader, LocalAlert, Skeleton, Tag, VStack } from '@navikt/ds-react'
import { ArrowLeftIcon, ChevronDownIcon, PersonCircleIcon, ShieldCheckmarkIcon, StarFillIcon } from '@navikt/aksel-icons'
import Monogram from '../onboarding/Monogram.tsx'
import { getInsurer } from '../onboarding/insurers.ts'
import type { ConnectionState } from '../onboarding/types.ts'
import { DIMENSIONS, DIMENSION_ORDER, type Dimension, type UserProfile } from '../profile/types.ts'
import { usePrefersReducedMotion } from '../useMediaQuery.ts'
import { buildMatchRequest, fetchMatches } from './api.ts'
import { scoreColor, scoreLabel } from './score.ts'
import type { InsurerMatch, MatchRequest } from './types.ts'
import '../onboarding/onboarding.css'
import '../profile/profile.css'
import './match.css'

const MIN_LOADING_MS = 900
const COUNT_UP_MS = 1200

type Props = {
  connections: ConnectionState
  profile: UserProfile
  onBack: () => void
  onContinue: () => void
  onCreateProfile: () => void
}

type Result = { request: MatchRequest; attempt: number; matches?: InsurerMatch[]; error?: string }

function useMatches(request: MatchRequest) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS))
    Promise.all([fetchMatches(request, controller.signal), minDelay])
      .then(([matches]) => setResult({ request, attempt, matches }))
      .catch(async (caught: unknown) => {
        if (controller.signal.aborted) return
        await minDelay
        if (controller.signal.aborted) return
        const network = caught instanceof TypeError
        setResult({ request, attempt, error: !network && caught instanceof Error ? caught.message : 'Vi fikk ikke kontakt med tjenesten. Prøv igjen.' })
      })
    return () => controller.abort()
  }, [request, attempt])

  const current = result?.request === request && result.attempt === attempt ? result : null
  return { matches: current?.matches, error: current?.error, loading: !current, retry: () => setAttempt((n) => n + 1) }
}

function useCountUp(target: number): number {
  const reduced = usePrefersReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (reduced) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS)
      setValue(Math.round(target * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, reduced])

  return reduced ? target : value
}

/**
 * Reveals list items as they scroll into view. Everything above the furthest item seen is
 * revealed too, so rows skipped by a fast scroll or jump never stay hidden.
 */
function useRevealedUpTo(): [(node: HTMLOListElement | null) => (() => void) | undefined, number] {
  const [revealed, setRevealed] = useState(-1)
  const ref = useCallback((list: HTMLOListElement | null) => {
    if (!list) return
    const items = [...list.children]
    if (!('IntersectionObserver' in window)) {
      setRevealed(items.length - 1)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      const seen = entries.filter((entry) => entry.isIntersecting || entry.boundingClientRect.bottom < 0)
      if (seen.length) setRevealed((prev) => Math.max(prev, ...seen.map((entry) => items.indexOf(entry.target))))
    }, { rootMargin: '0px 0px -8% 0px' })
    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])
  return [ref, revealed]
}

const insurerName = (id: string) => getInsurer(id)?.name ?? id

function ScoreRing({ score }: { score: number }) {
  const shown = useCountUp(score)
  return (
    <div
      className="match-ring"
      role="meter"
      aria-label="Match"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-valuetext={`${score} prosent, ${scoreLabel(score).toLowerCase()}`}
      style={{ '--match-color': scoreColor(score) } as CSSProperties}
    >
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle className="match-ring__track" cx="60" cy="60" r="52" pathLength={100} />
        <circle className="match-ring__value" cx="60" cy="60" r="52" pathLength={100} style={{ strokeDashoffset: 100 - score }} />
      </svg>
      <span className="match-ring__label" aria-hidden>
        <span className="match-ring__number">{shown}</span>
        <span className="match-ring__unit">%</span>
      </span>
    </div>
  )
}

function DimensionBars({ dimensions }: { dimensions: Record<Dimension, number> }) {
  return (
    <ul className="match-dims" aria-label="Match per område">
      {DIMENSION_ORDER.map((d) => (
        <li key={d} className="match-dim">
          <HStack justify="space-between" align="baseline" gap="space-8" wrap={false}>
            <Detail>{DIMENSIONS[d].label}</Detail>
            <Detail weight="semibold" className="match-num">{dimensions[d]} %</Detail>
          </HStack>
          <div className="match-bar match-bar--grow" role="meter" aria-label={DIMENSIONS[d].label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={dimensions[d]}>
            <span style={{ width: `${dimensions[d]}%`, background: scoreColor(dimensions[d]) }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function MatchHero({ match }: { match: InsurerMatch }) {
  const name = insurerName(match.insurerId)
  return (
    <Box
      as="section"
      aria-labelledby="best-match-heading"
      className="match-hero"
      background="raised"
      borderRadius="12"
      padding="space-20"
      borderWidth="1"
      borderColor="neutral-subtle"
      style={{ '--match-color': scoreColor(match.score) } as CSSProperties}
    >
      <VStack gap="space-16">
        <HStack gap="space-8" wrap>
          <Tag size="small" variant="moderate" data-color="success" icon={<StarFillIcon aria-hidden />}>Beste match</Tag>
          {match.isCurrent && <Tag size="small" variant="moderate" data-color="info">Din nåværende</Tag>}
        </HStack>
        <div className="match-hero__top">
          <ScoreRing score={match.score} />
          <VStack gap="space-8" className="match-hero__name">
            <Monogram id={match.insurerId} name={name} />
            <Heading id="best-match-heading" level="2" size="medium">{name}</Heading>
            <BodyShort weight="semibold" textColor="subtle">{scoreLabel(match.score)}</BodyShort>
          </VStack>
        </div>
        <BodyLong>{match.reason}</BodyLong>
        <DimensionBars dimensions={match.dimensions} />
      </VStack>
    </Box>
  )
}

function MatchRow({ match, rank, inView }: { match: InsurerMatch; rank: number; inView: boolean }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const name = insurerName(match.insurerId)
  const style = { '--match-w': `${match.score}%`, '--match-color': scoreColor(match.score), '--match-delay': `${(rank % 4) * 70}ms` } as CSSProperties

  return (
    <li className={`match-row${inView ? ' is-visible' : ''}`} style={style}>
      <button type="button" className="match-row__toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        <span className="match-row__rank"><span className="sr-only">Plass </span>{rank}</span>
        <Monogram id={match.insurerId} name={name} size="small" />
        <span className="match-row__text">
          <BodyShort as="span" weight="semibold" className="match-row__name">{name}</BodyShort>
          <HStack as="span" gap="space-4" align="center" wrap>
            <Detail as="span" textColor="subtle">{scoreLabel(match.score)}</Detail>
            {match.isCurrent && <Tag size="xsmall" variant="moderate" data-color="info">Din nåværende</Tag>}
          </HStack>
        </span>
        <BodyShort as="span" weight="semibold" className="match-num">{match.score} %</BodyShort>
        <ChevronDownIcon aria-hidden className="match-row__chevron" fontSize="1.5rem" />
      </button>
      <div className="match-bar match-row__bar" role="meter" aria-label={`Match med ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={match.score}>
        <span />
      </div>
      <div id={panelId} className="match-row__panel" hidden={!open}>
        <BodyShort size="small">{match.reason}</BodyShort>
        <DimensionBars dimensions={match.dimensions} />
      </div>
    </li>
  )
}

function MatchList({ matches }: { matches: InsurerMatch[] }) {
  const [ref, revealed] = useRevealedUpTo()
  return (
    <ol ref={ref} className="match-list">
      {matches.map((match, index) => <MatchRow key={match.insurerId} match={match} rank={index + 2} inView={index <= revealed} />)}
    </ol>
  )
}

function LoadingState() {
  return (
    <VStack gap="space-16" aria-busy>
      <HStack gap="space-12" align="center" role="status">
        <Loader size="small" title="Laster" />
        <BodyShort>Vi regner ut hvem som passer deg…</BodyShort>
      </HStack>
      <Skeleton variant="rounded" height={260} />
      <VStack gap="space-8">
        {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={64} />)}
      </VStack>
    </VStack>
  )
}

export default function MatchPage({ connections, profile, onBack, onContinue, onCreateProfile }: Props) {
  const request = useMemo(() => buildMatchRequest(profile, connections), [profile, connections])
  const { matches, error, loading, retry } = useMatches(request)
  const [best, ...rest] = matches ?? []

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <HStack gap="space-8" align="center">
          <ShieldCheckmarkIcon aria-hidden fontSize="1.75rem" className="onboarding__logo" />
          <Heading level="2" size="small">Vern</Heading>
        </HStack>

        <VStack gap="space-8">
          <Heading level="1" size="large">Hvem passer deg?</Heading>
          <BodyLong>Vi har sammenlignet forsikringsselskapene med det som er viktigst for deg.</BodyLong>
        </VStack>

        {!profile.answers && (
          <InfoCard data-color="info" size="small">
            <InfoCard.Header icon={<PersonCircleIcon aria-hidden />}>
              <InfoCard.Title as="h2">Lag verdiprofil for mer presise matcher</InfoCard.Title>
            </InfoCard.Header>
            <InfoCard.Content>
              <VStack gap="space-12" align="start">
                <BodyShort size="small">Nå vekter vi pris, dekning, hjelp og enkelhet likt.</BodyShort>
                <Button size="small" variant="secondary" onClick={onCreateProfile}>Lag verdiprofil</Button>
              </VStack>
            </InfoCard.Content>
          </InfoCard>
        )}

        {loading && <LoadingState />}

        {error && (
          <LocalAlert status="error">
            <LocalAlert.Header>
              <LocalAlert.Title as="h2">Kunne ikke hente matcher</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>
              <VStack gap="space-12" align="start">
                <BodyShort>{error}</BodyShort>
                <Button size="small" variant="secondary" onClick={retry}>Prøv igjen</Button>
              </VStack>
            </LocalAlert.Content>
          </LocalAlert>
        )}

        {matches && (
          <div role="status" className="sr-only">
            {best ? `Fant ${matches.length} matcher. Beste match er ${insurerName(best.insurerId)} med ${best.score} prosent.` : 'Fant ingen matcher.'}
          </div>
        )}

        {matches && !best && (
          <BodyShort textColor="subtle">Vi fant ingen selskaper å sammenligne ennå.</BodyShort>
        )}

        {best && <MatchHero match={best} />}

        {rest.length > 0 && (
          <VStack gap="space-12" as="section" aria-labelledby="others-heading">
            <Heading id="others-heading" level="2" size="xsmall">Slik matcher de andre</Heading>
            <Box background="raised" borderRadius="12" paddingInline="space-16" borderWidth="1" borderColor="neutral-subtle">
              <MatchList matches={rest} />
            </Box>
          </VStack>
        )}
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          <Button variant="tertiary" icon={<ArrowLeftIcon aria-hidden />} onClick={onBack}>Tilbake</Button>
          <Button onClick={onContinue}>Gå til Vern</Button>
        </div>
      </div>
    </Box>
  )
}
