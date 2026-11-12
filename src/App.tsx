import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { BodyLong, BodyShort, Button, Heading, Loader, Skeleton, Theme } from '@navikt/ds-react'
import { ArrowLeft, CircleAlert, Info, RefreshCw, X } from 'lucide-react'
import { VernSymbol } from './brand/VernLogo.tsx'
import Onboarding from './onboarding/Onboarding.tsx'
import { getInsurer, INSURERS, normalize } from './onboarding/insurers.ts'
import Monogram from './onboarding/Monogram.tsx'
import type { Policy } from './onboarding/types.ts'
import ProfilePage from './profile/ProfilePage.tsx'
import ValueProfileFlow from './profile/ValueProfileFlow.tsx'
import { QUESTIONS, type Answers, type UserProfile } from './profile/types.ts'
import { buildStoredProfile, deleteProfile, fetchProfile, isNewCustomer, saveProfile, type ProfileInput, type StoredProfile } from './profile/storage.ts'
import LandingPage from './landing/LandingPage.tsx'
import AboutYouPage from './landing/AboutYouPage.tsx'
import { clearAboutDraft, loadAboutDraft } from './landing/aboutDraft.ts'
import ChoiceQuestion from './journey/ChoiceQuestion.tsx'
import CallbackForm from './journey/CallbackForm.tsx'
import PreparePage from './journey/PreparePage.tsx'
import { BRANCH_QUESTIONS } from './journey/questions.ts'
import { loadJourneyDraft, parseCallbacks, parseJourney, saveJourneyDraft } from './journey/journeyDraft.ts'
import { isAboutYouFilled, parseAboutYou, type AboutYou, type CallbackRequest, type Journey } from './journey/types.ts'
import { clearDraft, loadDraft, parseQuestionParam, questionParam } from './profile/draft.ts'
import MatchPage, { ScoreRing } from './match/MatchPage.tsx'
import VernHeader from './onboarding/VernHeader.tsx'
import { buildMatchRequest, fetchMatches, friendlyError } from './match/api.ts'
import type { InsurerMatch } from './match/types.ts'
import { isStrictlyHigherMatch } from './match/score.ts'
import type { ConnectionState } from './onboarding/types.ts'
import './App.css'

type Recommendation = { insurance: string; company: string; price: number; fallback?: boolean }

const LANDING_PATH = '/start'
const ABOUT_PATH = '/om-deg'
const EDIT_ABOUT_PATH = '/profil/om-deg'
const HAS_INSURANCE_PATH = '/forsikringer-i-dag'
const CHECK_EXISTING_PATH = '/sjekke'
const FIND_NEW_PATH = '/ny-match'
const PREPARE_PATH = '/forbered'
const ONBOARDING_VALUES_PATH = '/verdiprofil'
const EDIT_VALUES_PATH = '/profil/verdiprofil'
const CALLBACK_PATH = '/ring-meg'
// Shows the recommendations when the customer has insurances, otherwise the matches.
const VERN_PATH = '/vern'
// Only these paths are accepted in ?tilbake= so the URL can't send the user anywhere else.
const RETURN_PATHS = [VERN_PATH, '/profil']

function hasInsurances(connections: ConnectionState): boolean {
  return Object.values(connections).some((policies) => policies.length > 0)
}

function returnPath(value: string | null): string {
  return value && RETURN_PATHS.includes(value) ? value : '/profil'
}

function App() {
  // New customers start on the landing page and go through onboarding as full pages:
  // /start → /om-deg → /forsikringer-i-dag → (/sjekke → /forbered | /ny-match) → /verdiprofil/:spm → (/forsikringer, only when checking
  // existing insurances) → /profil → /vern → /ring-meg/:selskap. /vern shows the recommendations when the customer
  // has insurances and the matches when they have none.
  // Returning customers (data/profile.json is filled in) go straight to /profil. The URL only holds where the user is;
  // the profile data lives here.
  const [loaded, setLoaded] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [connections, setConnections] = useState<ConnectionState>({})
  const [profile, setProfile] = useState<UserProfile>({ answers: null })
  const [aboutYou, setAboutYou] = useState<AboutYou | null>(null)
  const [journey, setJourney] = useState<Journey | null>(null)
  const [hasInsurance, setHasInsurance] = useState<boolean | null>(null)
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([])
  const [saveError, setSaveError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const syncSavedProfile = useCallback((stored: Partial<StoredProfile>) => {
    setOnboarded(!isNewCustomer(stored))
    setProfile({ answers: stored.valueProfile?.answers ?? null })
    setConnections(stored.insurances ?? {})
    setAboutYou(parseAboutYou(stored.aboutYou))
    setJourney(parseJourney(stored.journey))
    setCallbacks(parseCallbacks(stored.callbacks))
  }, [])

  useEffect(() => {
    let cancelled = false
    // Keeps answers from earlier onboarding steps when a later step is refreshed.
    function startOnboarding() {
      setProfile({ answers: loadDraft() })
      setAboutYou(loadAboutDraft())
      setJourney(loadJourneyDraft())
    }
    fetchProfile()
      .then((stored) => {
        if (cancelled) return
        if (isNewCustomer(stored)) startOnboarding()
        else syncSavedProfile(stored)
        setLoaded(true)
      })
      .catch((error) => {
        console.warn('Could not load profile, starting onboarding:', error)
        if (cancelled) return
        startOnboarding()
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [syncSavedProfile])

  function currentInput(overrides: Partial<ProfileInput> = {}): ProfileInput {
    return { answers: profile.answers, insurances: connections, aboutYou, journey, callbacks, ...overrides }
  }

  function persist(overrides: Partial<ProfileInput> = {}) {
    setSaveError('')
    clearDraft()
    clearAboutDraft()
    saveJourneyDraft(null)
    saveProfile(buildStoredProfile(currentInput(overrides)))
      .catch((error: unknown) => setSaveError(friendlyError(error, 'Vi fikk ikke lagret profilen din. Prøv igjen om litt.')))
  }

  function completeOnboarding(overrides: Partial<ProfileInput> = {}) {
    setOnboarded(true)
    persist(overrides)
    navigate('/profil')
  }

  // «Om deg» is optional: skipping clears whatever was typed.
  function finishAbout(about: AboutYou | null) {
    if (!about) clearAboutDraft()
    setAboutYou(isAboutYouFilled(about) ? about : null)
    navigate(HAS_INSURANCE_PATH)
  }

  function answerHasInsurance(yes: boolean) {
    setHasInsurance(yes)
    navigate(yes ? CHECK_EXISTING_PATH : FIND_NEW_PATH)
  }

  // Checking existing insurances first shows what to expect and what to have ready.
  function chooseJourney(next: Journey) {
    setJourney(next)
    saveJourneyDraft(next)
    navigate(next === 'sjekk' ? PREPARE_PATH : `${ONBOARDING_VALUES_PATH}/1`)
  }

  // Only the «check my insurances» branch continues to the upload step; a new match goes straight to the profile.
  function finishOnboardingValues(answers: Answers | null) {
    const nextAnswers = answers ?? profile.answers
    if (answers) setProfile({ answers })
    if (journey === 'ny') completeOnboarding({ answers: nextAnswers })
    else navigate('/forsikringer')
  }

  // Edits from the profile page return to the profile. The matches page can also send the user to step 1
  // and expects them back afterwards (?tilbake=/vern).
  function finishEditedValues(answers: Answers | null) {
    const nextAnswers = answers ?? profile.answers
    setProfile({ answers: nextAnswers })
    persist({ answers: nextAnswers })
    navigate(returnPath(searchParams.get('tilbake')))
  }

  function finishEditedAbout(about: AboutYou | null) {
    const next = about === null ? aboutYou : isAboutYouFilled(about) ? about : null
    setAboutYou(next)
    persist({ aboutYou: next })
    navigate('/profil')
  }

  function editValues(search = '') {
    clearDraft()
    navigate(`${EDIT_VALUES_PATH}/1${search}`)
  }

  function editAbout() {
    clearAboutDraft()
    navigate(EDIT_ABOUT_PATH)
  }

  function finishInsurers(next: ConnectionState) {
    setConnections(next)
    if (onboarded) {
      persist({ insurances: next })
      navigate('/profil')
    } else {
      completeOnboarding({ insurances: next })
    }
  }

  async function requestCallback(insurerId: string, phone: string) {
    const next = [...callbacks, { insurerId, phone, requestedAt: new Date().toISOString() }]
    await saveProfile(buildStoredProfile(currentInput({ callbacks: next })))
    setCallbacks(next)
  }

  async function reset() {
    try {
      await deleteProfile()
    } catch (error) {
      setSaveError(friendlyError(error, 'Vi fikk ikke slettet profilen din. Prøv igjen om litt.'))
      return
    }
    clearDraft()
    clearAboutDraft()
    saveJourneyDraft(null)
    setOnboarded(false)
    setConnections({})
    setProfile({ answers: null })
    setAboutYou(null)
    setJourney(null)
    setHasInsurance(null)
    setCallbacks([])
    navigate(LANDING_PATH, { replace: true })
  }

  const onboardedOnly = (element: ReactNode) =>
    onboarded ? element : <Navigate to={LANDING_PATH} replace />
  const newCustomerOnly = (element: ReactNode) =>
    onboarded ? <Navigate to="/profil" replace /> : element

  // «Del x av y»: Om deg, verdiprofil and, when checking existing insurances, the upload step.
  const totalParts = journey === 'ny' ? 2 : 3

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
          <Route path="/" element={<Navigate to={onboarded ? '/profil' : LANDING_PATH} replace />} />
          <Route path={LANDING_PATH} element={newCustomerOnly(<LandingPage onStart={() => navigate(ABOUT_PATH)} />)} />
          <Route path={ABOUT_PATH} element={newCustomerOnly(
            <AboutYouPage
              initialValue={aboutYou}
              stepLabel={`Del 1 av ${totalParts}`}
              onBack={() => navigate(LANDING_PATH)}
              onDone={finishAbout}
              onSkip={() => finishAbout(null)}
            />
          )} />
          <Route path={HAS_INSURANCE_PATH} element={newCustomerOnly(
            <ChoiceQuestion
              {...BRANCH_QUESTIONS.hasInsurance}
              initialValue={hasInsurance}
              onBack={() => navigate(ABOUT_PATH)}
              onAnswer={answerHasInsurance}
            />
          )} />
          <Route path={CHECK_EXISTING_PATH} element={newCustomerOnly(
            <ChoiceQuestion
              {...BRANCH_QUESTIONS.checkExisting}
              initialValue={journey === 'sjekk' ? true : null}
              onBack={() => navigate(HAS_INSURANCE_PATH)}
              onAnswer={(yes) => yes ? chooseJourney('sjekk') : navigate(FIND_NEW_PATH)}
            />
          )} />
          <Route path={PREPARE_PATH} element={newCustomerOnly(
            <PreparePage onBack={() => navigate(CHECK_EXISTING_PATH)} onContinue={() => navigate(`${ONBOARDING_VALUES_PATH}/1`)} />
          )} />
          <Route path={FIND_NEW_PATH} element={newCustomerOnly(
            <ChoiceQuestion
              {...BRANCH_QUESTIONS.findNew}
              initialValue={journey === 'ny' ? true : null}
              onBack={() => navigate(hasInsurance ? CHECK_EXISTING_PATH : HAS_INSURANCE_PATH)}
              onAnswer={(yes) => yes ? chooseJourney('ny') : completeOnboarding({ journey: null })}
            />
          )} />
          <Route path={`${ONBOARDING_VALUES_PATH}/:spm`} element={newCustomerOnly(
            <ValuesRoute
              basePath={ONBOARDING_VALUES_PATH}
              initialAnswers={profile.answers}
              doneLabel="Neste"
              stepLabel={`Del 2 av ${totalParts}`}
              onBack={() => navigate(journey === 'ny' ? FIND_NEW_PATH : PREPARE_PATH)}
              onDone={finishOnboardingValues}
              onSkip={() => finishOnboardingValues(null)}
            />
          )} />
          <Route path="/forsikringer" element={
            <Onboarding
              initialConnections={connections}
              stepLabel={onboarded ? undefined : 'Del 3 av 3'}
              onBack={onboarded ? undefined : () => navigate(`${ONBOARDING_VALUES_PATH}/${questionParam(QUESTIONS.length - 1)}`)}
              onDone={finishInsurers}
              onSkip={() => finishInsurers(connections)}
            />
          } />
          <Route path="/profil" element={onboardedOnly(
            <ProfilePage
              connections={connections}
              profile={profile}
              aboutYou={aboutYou}
              onEditAbout={editAbout}
              onAddInsurers={() => navigate('/forsikringer')}
              onEditProfile={() => editValues()}
              onReset={() => void reset()}
              onContinue={() => navigate(VERN_PATH)}
              continueLabel={hasInsurances(connections) ? 'Se forslagene dine' : 'Finn matchen din'}
            />
          )} />
          <Route path={EDIT_ABOUT_PATH} element={onboardedOnly(
            <AboutYouPage
              initialValue={aboutYou}
              onBack={() => navigate('/profil')}
              onDone={finishEditedAbout}
              onSkip={() => finishEditedAbout(null)}
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
          <Route path={VERN_PATH} element={onboardedOnly(hasInsurances(connections) ? (
            <Recommendations onBack={() => navigate('/profil')} onProfileChange={syncSavedProfile} />
          ) : (
            <MatchPage
              connections={connections}
              profile={profile}
              journey={journey}
              onBack={() => navigate('/profil')}
              onCreateProfile={() => editValues(`?tilbake=${VERN_PATH}`)}
              onRequestCallback={(insurerId) => navigate(`${CALLBACK_PATH}/${encodeURIComponent(insurerId)}`)}
              callbackRequestedFor={callbacks.map((callback) => callback.insurerId)}
            />
          ))} />
          <Route path="/matcher" element={<Navigate to={VERN_PATH} replace />} />
          <Route path={`${CALLBACK_PATH}/:selskap`} element={onboardedOnly(
            <CallbackRoute onSubmit={requestCallback} onBack={() => navigate(VERN_PATH)} />
          )} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Theme>
  )
}

// Reads the insurer from the URL; unknown insurers go back to the matches.
function CallbackRoute({ onSubmit, onBack }: { onSubmit: (insurerId: string, phone: string) => Promise<void>; onBack: () => void }) {
  const { selskap } = useParams()
  if (!selskap || !getInsurer(selskap)) return <Navigate to={VERN_PATH} replace />
  return <CallbackForm insurerId={selskap} onSubmit={(phone) => onSubmit(selskap, phone)} onBack={onBack} />
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