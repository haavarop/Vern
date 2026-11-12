import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { BodyLong, BodyShort, Button, Heading, Loader, Skeleton, Theme } from '@navikt/ds-react'
import { ArrowLeft, CircleAlert, Info, RefreshCw, X } from 'lucide-react'
import { VernSymbol } from './brand/VernLogo.tsx'
import Onboarding from './onboarding/Onboarding.tsx'
import { INSURERS, normalize } from './onboarding/insurers.ts'
import Monogram from './onboarding/Monogram.tsx'
import type { Policy } from './onboarding/types.ts'
import ProfilePage from './profile/ProfilePage.tsx'
import ValueProfileFlow from './profile/ValueProfileFlow.tsx'
import { QUESTIONS, type Answers, type UserProfile } from './profile/types.ts'
import { buildStoredProfile, deleteProfile, fetchProfile, isNewCustomer, saveProfile, type StoredProfile } from './profile/storage.ts'
import { clearDraft, loadDraft, parseQuestionParam, questionParam } from './profile/draft.ts'
import MatchPage, { ScoreRing } from './match/MatchPage.tsx'
import VernHeader from './onboarding/VernHeader.tsx'
import { buildMatchRequest, fetchMatches, friendlyError } from './match/api.ts'
import type { InsurerMatch } from './match/types.ts'
import { isStrictlyHigherMatch } from './match/score.ts'
import type { ConnectionState } from './onboarding/types.ts'
import './App.css'

type Recommendation = { insurance: string; company: string; price: number; fallback?: boolean }

const ONBOARDING_VALUES_PATH = '/verdiprofil'
const EDIT_VALUES_PATH = '/profil/verdiprofil'
// Only these paths are accepted in ?tilbake= so the URL can't send the user anywhere else.
const RETURN_PATHS = ['/matcher', '/profil']

function returnPath(value: string | null): string {
  return value && RETURN_PATHS.includes(value) ? value : '/profil'
}

function App() {
  // New customers see onboarding first as its own full page: /verdiprofil/:spm (steg 1) → /forsikringer (steg 2) → /profil → /matcher.
  // Returning customers (data/profile.json is filled in) go straight to /profil. The URL only holds where the user is;
  // the profile data lives here.
  const [loaded, setLoaded] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [seenMatches, setSeenMatches] = useState(false)
  const [connections, setConnections] = useState<ConnectionState>({})
  const [profile, setProfile] = useState<UserProfile>({ answers: null })
  const [saveError, setSaveError] = useState('')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()

  const syncSavedProfile = useCallback((stored: Partial<StoredProfile>) => {
    setOnboarded(!isNewCustomer(stored))
    setProfile({ answers: stored.valueProfile?.answers ?? null })
    setConnections(stored.insurances ?? {})
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchProfile()
      .then((stored) => {
        if (cancelled) return
        if (isNewCustomer(stored)) {
          // Keeps answers from step 1 when step 2 is refreshed.
          setProfile({ answers: loadDraft() })
        } else {
          setOnboarded(true)
          setSeenMatches(true)
          setProfile({ answers: stored.valueProfile?.answers ?? null })
          setConnections(stored.insurances ?? {})
        }
        setLoaded(true)
      })
      .catch((error) => {
        console.warn('Could not load profile, starting onboarding:', error)
        if (cancelled) return
        setProfile({ answers: loadDraft() })
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [])

  if (loaded && onboarded && !seenMatches && pathname === '/matcher') setSeenMatches(true)

  function persist(answers: Answers | null, insurances: ConnectionState) {
    setSaveError('')
    clearDraft()
    saveProfile(buildStoredProfile(answers, insurances))
      .catch((error: unknown) => setSaveError(friendlyError(error, 'Vi fikk ikke lagret profilen din. Prøv igjen om litt.')))
  }

  // During first-time onboarding, step 1 continues to step 2. The answers are saved together with the insurers.
  function finishOnboardingValues(answers: Answers | null) {
    if (answers) setProfile({ answers })
    navigate('/forsikringer')
  }

  // Edits from the profile page return to the profile. The matches page can also send the user to step 1
  // and expects them back afterwards (?tilbake=/matcher).
  function finishEditedValues(answers: Answers | null) {
    const nextAnswers = answers ?? profile.answers
    setProfile({ answers: nextAnswers })
    persist(nextAnswers, connections)
    navigate(returnPath(searchParams.get('tilbake')))
  }

  function editValues(search = '') {
    clearDraft()
    navigate(`${EDIT_VALUES_PATH}/1${search}`)
  }

  function finishInsurers(next: ConnectionState) {
    setConnections(next)
    setOnboarded(true)
    persist(profile.answers, next)
    navigate('/profil')
  }

  async function reset() {
    try {
      await deleteProfile()
    } catch (error) {
      setSaveError(friendlyError(error, 'Vi fikk ikke slettet profilen din. Prøv igjen om litt.'))
      return
    }
    clearDraft()
    setOnboarded(false)
    setSeenMatches(false)
    setConnections({})
    setProfile({ answers: null })
    navigate(`${ONBOARDING_VALUES_PATH}/1`, { replace: true })
  }

  const onboardedOnly = (element: ReactNode) =>
    onboarded ? element : <Navigate to={`${ONBOARDING_VALUES_PATH}/1`} replace />

  return (
    <Theme theme="light" hasBackground className="app-theme">
      {saveError && (
        <div className="app-notice app-notice--error app-toast" role="alert">
          <CircleAlert aria-hidden size={24} strokeWidth={2} />
          <BodyShort className="app-notice__text">{saveError}</BodyShort>
          <button type="button" className="app-notice__close" onClick={() => setSaveError('')} aria-label="Lukk meldingen"><X aria-hidden size={20} strokeWidth={2} /></button>
        </div>
      )}
      {!loaded ? (
        <div className="app-loading" role="status">
          <VernSymbol size={72} className="app-loading__symbol" />
          <BodyShort>{'Et øyeblikk, vi henter profilen din\u00a0…'}</BodyShort>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to={onboarded ? '/profil' : `${ONBOARDING_VALUES_PATH}/1`} replace />} />
          <Route path={`${ONBOARDING_VALUES_PATH}/:spm`} element={onboarded ? <Navigate to="/profil" replace /> : (
            <ValuesRoute
              basePath={ONBOARDING_VALUES_PATH}
              initialAnswers={profile.answers}
              doneLabel="Neste"
              onDone={finishOnboardingValues}
              onSkip={() => finishOnboardingValues(null)}
            />
          )} />
          <Route path="/forsikringer" element={
            <Onboarding
              initialConnections={connections}
              onBack={onboarded ? undefined : () => navigate(`${ONBOARDING_VALUES_PATH}/${questionParam(QUESTIONS.length - 1)}`)}
              onDone={finishInsurers}
              onSkip={() => finishInsurers(connections)}
            />
          } />
          <Route path="/profil" element={onboardedOnly(
            <ProfilePage
              connections={connections}
              profile={profile}
              onAddInsurers={() => navigate('/forsikringer')}
              onEditProfile={() => editValues()}
              onReset={() => void reset()}
              onContinue={() => navigate(seenMatches ? '/vern' : '/matcher')}
              continueLabel={seenMatches ? 'Se forslagene dine' : 'Finn matchen din'}
              onShowMatches={seenMatches ? () => navigate('/matcher') : undefined}
            />
          )} />
          <Route path={`${EDIT_VALUES_PATH}/:spm`} element={onboardedOnly(
            <ValuesRoute
              basePath={EDIT_VALUES_PATH}
              initialAnswers={profile.answers}
              doneLabel="Lagre"
              onDone={finishEditedValues}
              onSkip={() => finishEditedValues(null)}
            />
          )} />
          <Route path="/matcher" element={onboardedOnly(
            <MatchPage
              connections={connections}
              profile={profile}
              onBack={() => navigate('/profil')}
              onContinue={() => navigate('/vern')}
              onCreateProfile={() => editValues('?tilbake=/matcher')}
            />
          )} />
          <Route path="/vern" element={onboardedOnly(<Recommendations onBack={() => navigate('/profil')} onProfileChange={syncSavedProfile} />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Theme>
  )
}

type ValuesRouteProps = { basePath: string } & Omit<ComponentProps<typeof ValueProfileFlow>, 'step' | 'onStepChange'>

// Reads the question number from the URL. Stays mounted across steps, so the flow keeps its state.
function ValuesRoute({ basePath, ...props }: ValuesRouteProps) {
  const { spm } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const step = parseQuestionParam(spm)
  if (step === null) return <Navigate to={{ pathname: `${basePath}/1`, search }} replace />
  return (
    <ValueProfileFlow
      {...props}
      step={step}
      onStepChange={(next, options) => navigate(`${basePath}/${questionParam(next)}${search}`, { replace: options?.replace })}
    />
  )
}

function Recommendations({ onBack, onProfileChange }: { onBack: () => void; onProfileChange: (profile: Partial<StoredProfile>) => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncError, setSyncError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [currentPolicies, setCurrentPolicies] = useState<Policy[]>([])
  const [matches, setMatches] = useState<InsurerMatch[] | null>(null)

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined
    let lastProfile: string | undefined

    async function update(stored: Partial<StoredProfile>, signal: AbortSignal) {
      setLoading(true)
      setError('')
      setRecommendations(null)
      setCurrentPolicies([])
      setMatches(null)
      try {
        const connections = stored.insurances ?? {}
        const profile: UserProfile = { answers: stored.valueProfile?.answers ?? null }
        const [response, matchResults] = await Promise.all([
          fetch('/api/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal }),
          fetchMatches(buildMatchRequest(profile, connections), signal).catch(() => null),
        ])
        const data: unknown = await response.json().catch(() => null)
        if (!response.ok && !(data && typeof data === 'object' && 'error' in data)) throw new TypeError('Unreadable response')
        if (!response.ok) {
          throw new Error(data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error : 'Vi fikk ikke hentet forslagene dine. Prøv igjen om litt.')
        }
        if (!data || typeof data !== 'object' || !('recommendations' in data) || !Array.isArray(data.recommendations) ||
          !data.recommendations.every((item: unknown) => item && typeof item === 'object' &&
            'insurance' in item && typeof item.insurance === 'string' && item.insurance.trim() &&
            'company' in item && typeof item.company === 'string' && item.company.trim() &&
            'price' in item && typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 &&
            (!('fallback' in item) || typeof item.fallback === 'boolean'))) {
          throw new Error('Svaret vi fikk så ikke helt riktig ut. Prøv igjen.')
        }
        const policies = Object.values(connections).flat()
        if (data.recommendations.length !== policies.length || data.recommendations.some((item: Recommendation, index: number) => item.insurance !== policies[index].product)) {
          throw new Error('Forslagene passer ikke helt med profilen din. Sjekk at den er lagret, og prøv igjen.')
        }
        if (stopped || signal.aborted) return
        setRecommendations(data.recommendations as Recommendation[])
        setCurrentPolicies(policies)
        setMatches(matchResults)
      } catch (caught) {
        if (!stopped && !signal.aborted) setError(friendlyError(caught, 'Vi fikk ikke hentet forslagene dine. Prøv igjen om litt.'))
      } finally {
        if (!stopped && !signal.aborted) setLoading(false)
      }
    }

    async function syncProfile() {
      try {
        const stored = await fetchProfile({ attempts: 1 })
        if (stopped) return
        setSyncError('')
        const currentProfile = JSON.stringify(stored)
        if (currentProfile !== lastProfile) {
          lastProfile = currentProfile
          onProfileChange(stored)
          controller?.abort()
          controller = new AbortController()
          void update(stored, controller.signal)
        }
      } catch {
        if (!stopped) {
          setSyncError('Vi får ikke sjekket profilen din akkurat nå. Vi prøver igjen selv.')
          if (lastProfile === undefined) setLoading(false)
        }
      } finally {
        if (!stopped) timer = setTimeout(() => void syncProfile(), 2000)
      }
    }

    void syncProfile()
    return () => {
      stopped = true
      controller?.abort()
      if (timer) clearTimeout(timer)
    }
  }, [attempt, onProfileChange])

  const rankedRecommendations = (recommendations ?? []).map((recommendation, index) => {
    const currentPolicy = currentPolicies[index]
    const normalizedCompany = normalize(recommendation.company)
    const suggestedInsurer = INSURERS.find((item) => normalize(item.name) === normalizedCompany || item.aliases?.some((alias) => normalize(alias) === normalizedCompany))
    const suggestedMatch = matches?.find((item) => item.insurerId === suggestedInsurer?.id)
    const currentMatch = currentPolicy && matches?.find((item) => item.insurerId === currentPolicy.insurerId)
    const sameCompany = !!currentPolicy && (currentPolicy.insurerId === suggestedInsurer?.id || normalize(currentPolicy.insurer) === normalizedCompany)
    const requiresChange = !sameCompany && isStrictlyHigherMatch(currentMatch?.score, suggestedMatch?.score)
    return { recommendation, index, currentPolicy, suggestedInsurer, suggestedMatch, currentMatch, sameCompany, requiresChange }
  }).sort((left, right) => (right.suggestedMatch?.score ?? -1) - (left.suggestedMatch?.score ?? -1) || left.index - right.index)
  const recommendedChanges = rankedRecommendations.filter((item) => item.requiresChange)
  const unchangedRecommendations = rankedRecommendations.filter((item) => !item.requiresChange)

  const renderRecommendationGroup = (title: string, items: typeof rankedRecommendations, unchanged: boolean) => (
    <section className="recommendation-group" aria-labelledby={unchanged ? 'recommendation-unchanged-title' : 'recommendation-changes-title'}>
      <Heading id={unchanged ? 'recommendation-unchanged-title' : 'recommendation-changes-title'} level="2" size="large" className="recommendation-group__title">{title}</Heading>
      {items.length === 0 ? (
        <BodyShort className="vern-card">{unchanged ? 'Ingen forslag uten endring akkurat nå.' : 'Ingen anbefalte endringer akkurat nå.'}</BodyShort>
      ) : (
        <ol className="recommendation-list" aria-label={`${title} sortert etter match`}>
          {items.map(({ recommendation, currentPolicy, suggestedInsurer, currentMatch, suggestedMatch, sameCompany, index }) => (
            <li className="recommendation-pair" key={currentPolicy?.id ?? `${recommendation.insurance}-${index}`}>
              <Heading level="3" size="small" className="recommendation-pair__title">{recommendation.insurance}</Heading>
              {unchanged ? (
                <article className="recommendation-company recommendation-company--unchanged vern-card">
                  <BodyShort size="small" weight="semibold" className="recommendation-company__label">Selskapet du har i dag</BodyShort>
                  <div className="recommendation-company__identity">
                    {currentPolicy && <Monogram id={currentPolicy.insurerId} name={currentPolicy.insurer} size="small" />}
                    <BodyShort weight="semibold" className="recommendation-company__name">{currentPolicy?.insurer ?? recommendation.company}</BodyShort>
                  </div>
                  <ScoreRing score={currentMatch?.score} compact showMatchLabel />
                  <BodyShort size="small" className="match-muted">{sameCompany ? 'Selskapet ditt er fortsatt anbefalt' : 'Forslaget har ikke høyere match enn selskapet ditt'}</BodyShort>
                </article>
              ) : (
                <div className="recommendation-pair__companies">
                  <article className="recommendation-company vern-card">
                    <BodyShort size="small" weight="semibold" className="recommendation-company__label">Forsikringen din</BodyShort>
                    <div className="recommendation-company__identity">
                      {currentPolicy && <Monogram id={currentPolicy.insurerId} name={currentPolicy.insurer} size="small" />}
                      <BodyShort weight="semibold" className="recommendation-company__name">{currentPolicy?.insurer ?? 'Nåværende selskap'}</BodyShort>
                    </div>
                    <ScoreRing score={currentMatch?.score} compact showMatchLabel />
                    {currentMatch === undefined && <BodyShort size="small" className="match-muted">Match ikke tilgjengelig</BodyShort>}
                  </article>
                  <article className="recommendation-company recommendation-company--suggested vern-card">
                    <BodyShort size="small" weight="semibold" className="recommendation-company__label">Verns forslag</BodyShort>
                    <div className="recommendation-company__identity">
                      <Monogram id={suggestedInsurer?.id ?? recommendation.company} name={recommendation.company} size="small" />
                      <BodyShort weight="semibold" className="recommendation-company__name">{recommendation.company}</BodyShort>
                    </div>
                    <ScoreRing score={suggestedMatch?.score} compact showMatchLabel />
                    {suggestedMatch === undefined
                      ? <BodyShort size="small" className="match-muted">Match ikke tilgjengelig</BodyShort>
                      : <BodyShort size="small" className="recommendation-company__price">Demopris {new Intl.NumberFormat('nb-NO').format(recommendation.price)}&nbsp;kr per måned</BodyShort>}
                    {recommendation.fallback && <BodyShort size="small" className="match-muted">Viser selskapet du har i dag</BodyShort>}
                  </article>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )

  return (
    <main className="recommendation-page">
      <VernHeader>
        <Button type="button" variant="tertiary" size="small" icon={<ArrowLeft aria-hidden size={20} strokeWidth={2} />} onClick={onBack}>Profilen din</Button>
      </VernHeader>
      <div className="recommendation-intro">
        <Heading level="1" size="large">Forslagene dine</Heading>
        <BodyLong>Vi har sett på forsikringene dine, én og én, ut fra det som betyr noe for deg.</BodyLong>
      </div>
      <div className="recommendation-body" aria-live="polite">
        {syncError && (
          <div className="app-notice" role="status">
            <Info aria-hidden size={24} strokeWidth={2} />
            <BodyShort size="small" className="app-notice__text">{syncError}</BodyShort>
          </div>
        )}
        {recommendations !== null && (
          <section className="recommendations">
            <div className="app-notice">
              <Info aria-hidden size={24} strokeWidth={2} />
              <BodyShort size="small" className="app-notice__text">Dette er en demo med simulerte priser. Matchen gjelder selskapet, ikke hver enkelt forsikring.</BodyShort>
            </div>
            {recommendations.length === 0 && <BodyShort className="vern-card">Du har ikke lagt til noen forsikringer ennå. Legg dem til i profilen din, så ser vi på dem sammen.</BodyShort>}
            {recommendations.length > 0 && <div className="recommendation-groups">
              {renderRecommendationGroup('Anbefalte endringer', recommendedChanges, false)}
              {renderRecommendationGroup('Krever ikke endring', unchangedRecommendations, true)}
            </div>}
          </section>
        )}
        {loading && (
          <div className="recommendation-loading" aria-busy="true">
            <div className="recommendation-loading__status" role="status">
              <Loader size="small" title="Vent litt" />
              <BodyShort>{'Vi ser på forsikringene dine\u00a0…'}</BodyShort>
            </div>
            <Skeleton variant="rounded" height={220} className="app-skeleton" />
            <Skeleton variant="rounded" height={220} className="app-skeleton" />
          </div>
        )}
        {error && (
          <div className="app-notice app-notice--error" role="alert">
            <CircleAlert aria-hidden size={24} strokeWidth={2} />
            <div className="app-notice__text">
              <BodyShort weight="semibold">Det gikk ikke helt etter planen</BodyShort>
              <BodyShort size="small">{error}</BodyShort>
              <Button type="button" variant="secondary" size="small" icon={<RefreshCw aria-hidden size={18} strokeWidth={2} />} onClick={() => setAttempt((value) => value + 1)}>Prøv igjen</Button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default App