import { useCallback, useEffect, useId, useMemo, useState, type CSSProperties } from 'react'
import { BodyLong, BodyShort, Button, Heading, Loader, Skeleton } from '@navikt/ds-react'
import { ArrowLeft, ArrowRight, ChevronDown, CircleAlert, CircleCheck, Sparkles } from 'lucide-react'
import Monogram from '../onboarding/Monogram.tsx'
import { getInsurer } from '../onboarding/insurers.ts'
import type { ConnectionState } from '../onboarding/types.ts'
import { DIMENSIONS, DIMENSION_ORDER, type Dimension, type UserProfile } from '../profile/types.ts'
import { usePrefersReducedMotion } from '../useMediaQuery.ts'
import { buildMatchRequest, fetchMatches, friendlyError } from './api.ts'
import VernHeader from '../onboarding/VernHeader.tsx'
import { coverageTopics, formatScore, highlightLines, scoreLabel } from './score.ts'
import type { InsurerMatch, MatchRequest } from './types.ts'
import '../onboarding/onboarding.css'
import './match.css'

const MIN_LOADING_MS = 900
const COUNT_UP_MS = 1200
const TOP = 3

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
        setResult({ request, attempt, error: friendlyError(caught, 'Vi fikk ikke hentet matchene dine. Prøv igjen om litt.') })
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

/** Brand match ring: apricot ring on a light track, white fill, forest score in the middle. */
export function ScoreRing({ score, compact = false, showMatchLabel = false }: { score?: number; compact?: boolean; showMatchLabel?: boolean }) {
  const shown = useCountUp(score ?? 0)
  return (
    <div
      className={`match-ring${compact ? ' match-ring--compact' : ''}`}
      role={score === undefined ? 'img' : 'meter'}
      aria-label={score === undefined ? 'Match ikke tilgjengelig' : `Match ${score} prosent`}
      aria-valuemin={score === undefined ? undefined : 0}
      aria-valuemax={score === undefined ? undefined : 100}
      aria-valuenow={score}
      aria-valuetext={score === undefined ? undefined : `${score} prosent, ${scoreLabel(score).toLowerCase()}`}
    >
      <svg viewBox="0 0 128 128" aria-hidden>
        <circle className="match-ring__fill" cx="64" cy="64" r="64" />
        <circle className="match-ring__track" cx="64" cy="64" r="56" pathLength={100} />
        <circle className="match-ring__value" cx="64" cy="64" r="56" pathLength={100} style={{ strokeDashoffset: 100 - (score ?? 0) }} />
      </svg>
      <span className={`match-ring__label${compact ? ' match-ring__label--compact' : ''}`} aria-hidden>
        {score === undefined ? '–' : formatScore(shown)}
        {showMatchLabel && <span className="match-ring__caption">match</span>}
      </span>
    </div>
  )
}

function DimensionBars({ dimensions }: { dimensions: Record<Dimension, number> }) {
  return (
    <ul className="match-dims" aria-label="Slik passer selskapet deg">
      {DIMENSION_ORDER.map((d) => (
        <li key={d} className="match-dim">
          <span className="match-dim__head vern-body-small">
            <span>{DIMENSIONS[d].label}</span>
            <strong className="match-num">{formatScore(dimensions[d])}</strong>
          </span>
          <div className="match-bar match-bar--grow" role="meter" aria-label={DIMENSIONS[d].label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={dimensions[d]}>
            <span style={{ width: `${dimensions[d]}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ScorePill({ score }: { score: number }) {
  return <span className="match-score-pill match-num">{formatScore(score)}<span className="sr-only"> match</span></span>
}

function CurrentBadge() {
  return <span className="match-badge match-badge--current">Ditt selskap i dag</span>
}

/** "Se hvorfor": opens the reason and the per-area bars. */
function WhyToggle({ match }: { match: InsurerMatch }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return (
    <>
      <button type="button" className="match-why" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        {open ? 'Skjul' : 'Se hvorfor'}
        <ChevronDown aria-hidden size={20} strokeWidth={2} className="match-why__chevron" />
      </button>
      <div id={panelId} className="match-why__panel" hidden={!open}>
        <BodyShort size="small">{match.reason}</BodyShort>
        <DimensionBars dimensions={match.dimensions} />
      </div>
    </>
  )
}

export function MatchHero({ match, recommendation, highlight, compact = false }: {
  match?: InsurerMatch
  recommendation?: { insurance: string; company: string; price: number; insurerId?: string; fallback?: boolean }
  highlight?: string
  /** Shows the score as a small pill instead of the ring, so only the first card gets the apricot ring. */
  compact?: boolean
}) {
  const headingId = useId()
  const name = recommendation?.company ?? (match ? insurerName(match.insurerId) : '')
  const insurerId = match?.insurerId ?? recommendation?.insurerId
  // The best match is the forest card; suggestions on the recommendations page are calm white cards.
  const best = !recommendation
  const label = recommendation?.fallback ? 'Det du har i dag' : recommendation ? 'Forslag fra Vern' : 'Beste match'

  return (
    <section
      aria-labelledby={headingId}
      className={['match-hero', best ? 'vern-card--inverse match-hero--best' : 'vern-card', recommendation && !match ? 'match-hero--without-score' : ''].filter(Boolean).join(' ')}
    >
      <div className="match-hero__labels">
        <span className="match-badge">{label}</span>
        {match?.isCurrent && !recommendation?.fallback && <CurrentBadge />}
      </div>
      <div className={`match-hero__top${compact ? ' match-hero__top--compact' : ''}`}>
        {match && (compact ? <ScorePill score={match.score} /> : <ScoreRing score={match.score} />)}
        <div className="match-hero__name">
          {insurerId && <Monogram id={insurerId} name={name} />}
          <Heading id={headingId} level="2" size="medium">{recommendation?.insurance ?? name}</Heading>
          {recommendation && <BodyShort weight="semibold">{name}</BodyShort>}
          {highlight && <BodyShort weight="semibold">{highlight}</BodyShort>}
          {recommendation && <BodyShort size="small">{`Demopris ${new Intl.NumberFormat('nb-NO').format(recommendation.price)}\u00a0kr per måned`}</BodyShort>}
          {!match && <BodyShort size="small" className="match-muted">Matchen er ikke klar ennå.</BodyShort>}
        </div>
      </div>
      {recommendation?.fallback && <BodyShort size="small" className="match-muted">Vern har ikke vurdert denne ennå, så du ser forsikringen du har i dag.</BodyShort>}
      {match && <WhyToggle match={match} />}
    </section>
  )
}

function MatchCard({ match, highlight }: { match: InsurerMatch; highlight: string }) {
  const headingId = useId()
  const name = insurerName(match.insurerId)
  return (
    <li className="match-card vern-card" aria-labelledby={headingId}>
      <div className="match-card__top">
        <Monogram id={match.insurerId} name={name} />
        <div className="match-card__text">
          <Heading id={headingId} level="3" size="small">{name}</Heading>
          <BodyShort size="small">{highlight}</BodyShort>
          {match.isCurrent && <CurrentBadge />}
        </div>
        <ScorePill score={match.score} />
      </div>
      <WhyToggle match={match} />
    </li>
  )
}

function MatchRow({ match, rank, inView }: { match: InsurerMatch; rank: number; inView: boolean }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const name = insurerName(match.insurerId)

  return (
    <li className={`match-row${inView ? ' is-visible' : ''}`} style={{ '--match-w': `${match.score}%`, '--match-delay': `${(rank % 4) * 70}ms` } as CSSProperties}>
      <button type="button" className="match-row__toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        <span className="match-row__rank" aria-hidden>{rank}</span>
        <Monogram id={match.insurerId} name={name} size="small" />
        <span className="match-row__text">
          <BodyShort as="span" weight="semibold" className="match-row__name">{name}</BodyShort>
          <span className="match-row__meta">
            <BodyShort as="span" size="small" className="match-muted">{scoreLabel(match.score)}</BodyShort>
            {match.isCurrent && <CurrentBadge />}
          </span>
        </span>
        <BodyShort as="span" weight="semibold" className="match-num">{formatScore(match.score)}</BodyShort>
        <ChevronDown aria-hidden size={20} strokeWidth={2} className="match-row__chevron" />
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

function MatchList({ matches, startRank }: { matches: InsurerMatch[]; startRank: number }) {
  const [ref, revealed] = useRevealedUpTo()
  return (
    <ol ref={ref} className="match-list vern-card">
      {matches.map((match, index) => <MatchRow key={match.insurerId} match={match} rank={index + startRank} inView={index <= revealed} />)}
    </ol>
  )
}

function LoadingState() {
  return (
    <div className="match-stack" aria-busy>
      <div className="match-loading" role="status">
        <Loader size="small" title="Vent litt" />
        <BodyShort>{'Vi finner matchen din\u00a0…'}</BodyShort>
      </div>
      <Skeleton variant="rounded" height={280} className="match-skeleton match-skeleton--best" />
      {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={120} className="match-skeleton" />)}
    </div>
  )
}

export default function MatchPage({ connections, profile, onBack, onContinue, onCreateProfile }: Props) {
  const request = useMemo(() => buildMatchRequest(profile, connections), [profile, connections])
  const { matches, error, loading, retry } = useMatches(request)
  const [best, ...others] = matches ?? []
  const top = others.slice(0, TOP - 1)
  const rest = others.slice(TOP - 1)
  const highlights = matches ? highlightLines(matches.slice(0, TOP), matches) : []
  const covered = coverageTopics(connections)

  return (
    <main className="match-page">
      <div className="match-page__content">
        <VernHeader />

        <div className="match-intro">
          <Heading level="1" size="large">Matchen din</Heading>
          <BodyLong>
            {matches && matches.length > 1
              ? `Vi har sammenlignet ${matches.length} selskaper ut fra det som betyr noe for deg.`
              : 'Vi sammenligner selskapene ut fra det som betyr noe for deg.'}
          </BodyLong>
        </div>

        {covered && (
          <p className="vern-status-positive match-status vern-body">
            <CircleCheck aria-hidden size={24} strokeWidth={2} />
            <span>Du har forsikring for {covered} i dag.</span>
          </p>
        )}

        {!profile.answers && (
          <section className="vern-card match-profile-nudge" aria-labelledby="profile-nudge-heading">
            <Sparkles aria-hidden size={24} strokeWidth={2} className="match-icon" />
            <div className="match-stack match-stack--tight">
              <Heading id="profile-nudge-heading" level="2" size="small">Gjør matchen mer din</Heading>
              <BodyShort size="small">Nå teller pris, dekning, hjelp og enkelhet like mye. Svar på noen korte spørsmål, så treffer vi bedre.</BodyShort>
              <Button size="small" variant="secondary" onClick={onCreateProfile}>Svar på spørsmålene</Button>
            </div>
          </section>
        )}

        {loading && <LoadingState />}

        {error && (
          <div className="app-notice app-notice--error" role="alert">
            <CircleAlert aria-hidden size={24} strokeWidth={2} />
            <div className="app-notice__text">
              <BodyShort weight="semibold">Det gikk ikke helt etter planen</BodyShort>
              <BodyShort size="small">{error}</BodyShort>
              <Button size="small" variant="secondary" onClick={retry}>Prøv igjen</Button>
            </div>
          </div>
        )}

        {matches && (
          <div role="status">
            <span className="sr-only">
              {best ? `Vi fant ${matches.length} selskaper. Beste match er ${insurerName(best.insurerId)} med ${best.score} prosent.` : 'Vi fant ingen selskaper.'}
            </span>
          </div>
        )}

        {matches && !best && (
          <section className="vern-card">
            <BodyShort>Vi fant ingen selskaper å sammenligne ennå. Legg til forsikringene dine, så prøver vi igjen.</BodyShort>
          </section>
        )}

        {best && (
          <section className="match-stack" aria-labelledby="top-heading">
            <div className="match-section-head">
              <BodyShort size="small" className="match-muted">Dine beste matcher</BodyShort>
              <Heading id="top-heading" level="2" size="medium">Topp {Math.min(TOP, matches!.length)}</Heading>
            </div>
            <MatchHero match={best} highlight={highlights[0]} />
            {top.length > 0 && (
              <ol className="match-stack match-cards" start={2}>
                {top.map((match, index) => <MatchCard key={match.insurerId} match={match} highlight={highlights[index + 1]} />)}
              </ol>
            )}
          </section>
        )}

        {rest.length > 0 && (
          <section className="match-stack" aria-labelledby="others-heading">
            <Heading id="others-heading" level="2" size="small">Flere selskaper</Heading>
            <MatchList matches={rest} startRank={TOP + 1} />
          </section>
        )}

        {best && <p className="match-footer vern-body-small">Vern er uavhengig. Rekkefølgen bygger på det du har fortalt oss og hvordan selskapene scorer.</p>}
      </div>

      <div className="match-actions">
        <div className="match-actions__inner">
          <Button variant="tertiary" icon={<ArrowLeft aria-hidden size={20} strokeWidth={2} />} onClick={onBack}>Tilbake</Button>
          <Button icon={<ArrowRight aria-hidden size={20} strokeWidth={2} />} iconPosition="right" onClick={onContinue}>Se forslagene dine</Button>
        </div>
      </div>
    </main>
  )
}
