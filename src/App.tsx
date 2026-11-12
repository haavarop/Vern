import { useCallback, useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Alert, BodyLong, BodyShort, Box, Button, Detail, Heading, HStack, Loader, Skeleton, Tag, Theme, VStack } from '@navikt/ds-react'
import { ArrowLeftIcon } from '@navikt/aksel-icons'
import Onboarding from './onboarding/Onboarding.tsx'
import { INSURERS, normalize } from './onboarding/insurers.ts'
import ProfilePage from './profile/ProfilePage.tsx'
import ValueProfileFlow from './profile/ValueProfileFlow.tsx'
import { QUESTIONS, type Answers, type UserProfile } from './profile/types.ts'
import { buildStoredProfile, deleteProfile, fetchProfile, isNewCustomer, saveProfile, type StoredProfile } from './profile/storage.ts'
import { clearDraft, loadDraft, parseQuestionParam, questionParam, saveDraft } from './profile/draft.ts'
import MatchPage, { MatchHero } from './match/MatchPage.tsx'
import { buildMatchRequest, fetchMatches } from './match/api.ts'
import type { CoverageGap, InsurerMatch, Recommendation } from './match/types.ts'
import type { ConnectionState } from './onboarding/types.ts'
import PersonaImport from './persona/PersonaImport.tsx'
import { parsePersonaPass, type PersonaPass, type ValueProfileSuggestion } from './persona/pass.ts'
import { usePrefersDark } from './useMediaQuery.ts'
import './App.css'
import './persona/persona.css'

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
  // Traits shared from The Digital You, and the answers Vern suggested from them in this session.
  const [persona, setPersona] = useState<PersonaPass | null>(null)
  const [suggestion, setSuggestion] = useState<ValueProfileSuggestion | null>(null)
  const [saveError, setSaveError] = useState('')
  const prefersDark = usePrefersDark()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()

  const syncSavedProfile = useCallback((stored: Partial<StoredProfile>) => {
    setOnboarded(!isNewCustomer(stored))
    setProfile({ answers: stored.valueProfile?.answers ?? null })
    setConnections(stored.insurances ?? {})
    setPersona(parsePersonaPass(stored.persona))
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
          setPersona(parsePersonaPass(stored.persona))
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

  function persist(answers: Answers | null, insurances: ConnectionState, sharedPersona = persona) {
    setSaveError('')
    clearDraft()
    saveProfile(buildStoredProfile(answers, insurances, sharedPersona))
      .catch((error: unknown) => setSaveError(error instanceof Error ? error.message : 'Kunne ikke lagre profilen.'))
  }

  // A Persona Pass pre-fills the value-profile questions. New customers continue onboarding from there;
  // returning customers review the suggested answers, and the pass is saved right away.
  function importPersona(pass: PersonaPass, suggested: ValueProfileSuggestion | null) {
    setPersona(pass)
    setSuggestion(suggested)
    if (onboarded) persist(profile.answers, connections, pass)
    // The questions start from the draft, so the suggested answers replace any earlier one.
    clearDraft()
    if (suggested) saveDraft(suggested.answers)
    navigate(`${onboarded ? EDIT_VALUES_PATH : ONBOARDING_VALUES_PATH}/1`)
  }

  // Revocation: Vern forgets the traits and stops using them for recommendations.
  function stopSharing() {
    setPersona(null)
    setSuggestion(null)
    persist(profile.answers, connections, null)
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
      setSaveError(error instanceof Error ? error.message : 'Kunne ikke slette profilen.')
      return
    }
    clearDraft()
    setOnboarded(false)
    setSeenMatches(false)
    setConnections({})
    setProfile({ answers: null })
    setPersona(null)
    setSuggestion(null)
    navigate(`${ONBOARDING_VALUES_PATH}/1`, { replace: true })
  }

  const onboardedOnly = (element: ReactNode) =>
    onboarded ? element : <Navigate to={`${ONBOARDING_VALUES_PATH}/1`} replace />

  return (
    <Theme theme={prefersDark ? 'dark' : 'light'} hasBackground className="app-theme">
      {saveError && (
        <Alert variant="error" size="small" closeButton onClose={() => setSaveError('')} className="app-alert">{saveError}</Alert>
      )}
      {!loaded ? (
        <HStack justify="center" align="center" className="app-loading">
          <Loader size="xlarge" title="Henter profilen din…" />
        </HStack>
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to={onboarded ? '/profil' : `${ONBOARDING_VALUES_PATH}/1`} replace />} />
          <Route path="/persona" element={<PersonaImport onImport={importPersona} onCancel={() => navigate('/', { replace: true })} />} />
          <Route path={`${ONBOARDING_VALUES_PATH}/:spm`} element={onboarded ? <Navigate to="/profil" replace /> : (
            <ValuesRoute
              basePath={ONBOARDING_VALUES_PATH}
              initialAnswers={profile.answers}
              suggestion={suggestion}
              doneLabel="Neste: hent forsikringer"
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
              persona={persona}
              onStopSharing={stopSharing}
              onAddInsurers={() => navigate('/forsikringer')}
              onEditProfile={() => editValues()}
              onReset={() => void reset()}
              onContinue={() => navigate(seenMatches ? '/vern' : '/matcher')}
              continueLabel={seenMatches ? 'Gå til Vern' : 'Se hvem som passer deg'}
              onShowMatches={seenMatches ? () => navigate('/matcher') : undefined}
            />
          )} />
          <Route path={`${EDIT_VALUES_PATH}/:spm`} element={onboardedOnly(
            <ValuesRoute
              basePath={EDIT_VALUES_PATH}
              initialAnswers={profile.answers}
              suggestion={suggestion}
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
  const [gaps, setGaps] = useState<CoverageGap[]>([])
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
      setGaps([])
      setMatches(null)
      try {
        const connections = stored.insurances ?? {}
        const profile: UserProfile = { answers: stored.valueProfile?.answers ?? null }
        const [response, matchResults] = await Promise.all([
          fetch('/api/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal }),
          fetchMatches(buildMatchRequest(profile, connections), signal).catch(() => null),
        ])
        const data: unknown = await response.json()
        if (!response.ok) {
          throw new Error(data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error : 'Kunne ikke hente forslagene. Prøv igjen.')
        }
        if (!data || typeof data !== 'object' || !('recommendations' in data) || !Array.isArray(data.recommendations) ||
          !data.recommendations.every((item: unknown) => item && typeof item === 'object' &&
            'insurance' in item && typeof item.insurance === 'string' && item.insurance.trim() &&
            'company' in item && typeof item.company === 'string' && item.company.trim() &&
            'price' in item && typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 &&
            (!('reason' in item) || typeof item.reason === 'string') &&
            (!('fallback' in item) || typeof item.fallback === 'boolean'))) {
          throw new Error('Fikk et ugyldig svar. Prøv igjen.')
        }
        const policies = Object.values(connections).flat()
        if (data.recommendations.length !== policies.length || data.recommendations.some((item: Recommendation, index: number) => item.insurance !== policies[index].product)) {
          throw new Error('Forslagene samsvarer ikke med profilen. Kontroller at profilen er lagret og prøv igjen.')
        }
        if (stopped || signal.aborted) return
        setRecommendations(data.recommendations as Recommendation[])
        setGaps('gaps' in data && Array.isArray(data.gaps) ? data.gaps.filter(isGap) : [])
        setMatches(matchResults)
      } catch (caught) {
        if (!stopped && !signal.aborted) setError(caught instanceof Error ? caught.message : 'Kunne ikke hente forslagene. Prøv igjen.')
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
          setSyncError('Kunne ikke kontrollere profilen. Prøver igjen automatisk.')
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

  return (
    <main className="recommendation-page">
      <Button type="button" variant="tertiary" icon={<ArrowLeftIcon aria-hidden />} onClick={onBack}>Tilbake til profil</Button>
      <div aria-live="polite">
        {syncError && <Alert variant="warning" size="small">{syncError}</Alert>}
        {recommendations !== null && (
          <section className="recommendations" aria-label="Forsikringsforslag">
            <Alert variant="info" size="small">Simulerte forslag, priser og matchscorer. Matchscoren gjelder selskapet, ikke den enkelte forsikringen.</Alert>
            {gaps.length > 0 && (
              <VStack as="section" gap="space-12" aria-labelledby="gaps-heading" className="gaps">
                <VStack gap="space-4">
                  <Heading id="gaps-heading" level="2" size="small">Dette ser ut til å mangle</Heading>
                  <BodyShort textColor="subtle">Ut fra det du deler i Persona Pass.</BodyShort>
                </VStack>
                {gaps.map((gap) => <GapCard key={gap.product} gap={gap} />)}
              </VStack>
            )}
            {recommendations.length === 0 && <BodyShort>Ingen forsikringer er registrert i profilen.</BodyShort>}
            {recommendations.map((recommendation, index) => {
              const company = normalize(recommendation.company)
              const insurer = INSURERS.find((item) => normalize(item.name) === company || item.aliases?.some((alias) => normalize(alias) === company))
              const match = matches?.find((item) => item.insurerId === insurer?.id)
              return <MatchHero key={index} match={match} recommendation={{ ...recommendation, insurerId: insurer?.id }} />
            })}
          </section>
        )}
        {loading && (
          <VStack gap="space-16" className="recommendation-loading" aria-busy="true">
            <Heading level="1" size="medium">Dine forsikringsforslag</Heading>
            <HStack gap="space-12" align="center" role="status">
              <Loader size="small" title="Laster" />
              <BodyShort>Vi finner forslag til forsikringene dine…</BodyShort>
            </HStack>
            <Skeleton variant="rounded" height={220} />
            <Skeleton variant="rounded" height={220} />
          </VStack>
        )}
        {error && <Alert variant="error" size="small">{error} <Button type="button" variant="secondary" size="small" onClick={() => setAttempt((value) => value + 1)}>Prøv igjen</Button></Alert>}
      </div>
    </main>
  )
}

function isGap(value: unknown): value is CoverageGap {
  return !!value && typeof value === 'object' &&
    'product' in value && typeof value.product === 'string' &&
    'segment' in value && typeof value.segment === 'string' &&
    'reason' in value && typeof value.reason === 'string' &&
    'lookFor' in value && typeof value.lookFor === 'string' &&
    'basedOn' in value && Array.isArray(value.basedOn) && value.basedOn.every((item: unknown) => typeof item === 'string')
}

function GapCard({ gap }: { gap: CoverageGap }) {
  return (
    <Box as="article" background="raised" borderRadius="12" padding="space-20" borderWidth="1" borderColor="neutral-subtle" className="gap-card">
      <VStack gap="space-8">
        <Heading level="3" size="small">{gap.product}</Heading>
        <BodyLong>{gap.reason}</BodyLong>
        <BodyShort size="small"><strong>Sammenlign utover pris:</strong> {gap.lookFor}</BodyShort>
        <Detail textColor="subtle">Bygger på dette du deler:</Detail>
        <ul className="gap-card__traits">
          {gap.basedOn.map((trait) => (
            <li key={trait}><Tag size="xsmall" variant="moderate" data-color="neutral" lang="en">{trait}</Tag></li>
          ))}
        </ul>
      </VStack>
    </Box>
  )
}

export default App