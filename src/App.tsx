import { useEffect, useState, type ComponentProps, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowUp } from 'lucide-react'
import { Alert, HStack, Loader, Theme } from '@navikt/ds-react'
import Onboarding from './onboarding/Onboarding.tsx'
import ProfilePage from './profile/ProfilePage.tsx'
import ValueProfileFlow from './profile/ValueProfileFlow.tsx'
import { QUESTIONS, type Answers, type UserProfile } from './profile/types.ts'
import { buildStoredProfile, deleteProfile, fetchProfile, isNewCustomer, saveProfile } from './profile/storage.ts'
import { clearDraft, loadDraft, parseQuestionParam, questionParam } from './profile/draft.ts'
import MatchPage from './match/MatchPage.tsx'
import type { ConnectionState } from './onboarding/types.ts'
import { usePrefersDark } from './useMediaQuery.ts'
import './App.css'

type Message = { role: 'user' | 'assistant'; content: string }

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
  const prefersDark = usePrefersDark()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()

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
      .catch((error: unknown) => setSaveError(error instanceof Error ? error.message : 'Kunne ikke lagre profilen.'))
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
          <Route path={`${ONBOARDING_VALUES_PATH}/:spm`} element={onboarded ? <Navigate to="/profil" replace /> : (
            <ValuesRoute
              basePath={ONBOARDING_VALUES_PATH}
              initialAnswers={profile.answers}
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
          <Route path="/vern" element={onboardedOnly(<Chat />)} />
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

function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendPrompt(value: string) {
    const content = value.trim()
    if (!content || loading) return
    const nextMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setPrompt('')
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data: unknown = await response.json()
      if (!response.ok) {
        throw new Error(data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error : 'Noe gikk galt. Prøv igjen.')
      }
      if (!data || typeof data !== 'object' || !('reply' in data) || typeof data.reply !== 'string' || !data.reply.trim()) {
        throw new Error('Fikk et tomt svar. Prøv igjen.')
      }
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }])
    } catch (caught) {
      setMessages(messages)
      setPrompt(content)
      setError(caught instanceof Error ? caught.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setLoading(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendPrompt(prompt)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void sendPrompt(prompt)
    }
  }

  return (
    <main className="chat">
      <div className="conversation" aria-live="polite">
        {messages.map((message, index) => (
          <div className="message" key={index}>
            <strong>{message.role === 'user' ? 'Du' : 'Vern'}</strong>
            <p>{message.content}</p>
          </div>
        ))}
        {loading && <p role="status">Tenker…</p>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <form className="composer" onSubmit={submit}>
        <textarea aria-label="Melding" placeholder="Skriv en melding…" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={handleKeyDown} rows={3} disabled={loading} />
        <button type="submit" disabled={loading || !prompt.trim()} aria-label="Send melding" title="Send melding"><ArrowUp size={20} /></button>
      </form>
    </main>
  )
}

export default App