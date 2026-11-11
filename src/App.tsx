import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { Alert, HStack, Loader, Theme } from '@navikt/ds-react'
import Onboarding from './onboarding/Onboarding.tsx'
import ProfilePage from './profile/ProfilePage.tsx'
import ValueProfileFlow from './profile/ValueProfileFlow.tsx'
import type { Answers, UserProfile } from './profile/types.ts'
import { buildStoredProfile, deleteProfile, fetchProfile, isNewCustomer, saveProfile } from './profile/storage.ts'
import MatchPage from './match/MatchPage.tsx'
import type { ConnectionState } from './onboarding/types.ts'
import { usePrefersDark } from './useMediaQuery.ts'
import './App.css'

type Message = { role: 'user' | 'assistant'; content: string }

type View = 'loading' | 'values' | 'insurers' | 'profile' | 'matches' | 'chat'

function App() {
  // New customers see onboarding first as its own full page: verdiprofil (steg 1) → forsikringer (steg 2) → profil → matcher.
  // Returning customers (data/profile.json is filled in) go straight to the profile.
  const [view, setView] = useState<View>('loading')
  const [onboarded, setOnboarded] = useState(false)
  const [seenMatches, setSeenMatches] = useState(false)
  const [valuesReturn, setValuesReturn] = useState<View | null>(null)
  const [connections, setConnections] = useState<ConnectionState>({})
  const [profile, setProfile] = useState<UserProfile>({ answers: null })
  const [saveError, setSaveError] = useState('')
  const prefersDark = usePrefersDark()

  useEffect(() => {
    let cancelled = false
    fetchProfile()
      .then((stored) => {
        if (cancelled) return
        if (isNewCustomer(stored)) {
          setView('values')
          return
        }
        setOnboarded(true)
        setSeenMatches(true)
        setProfile({ answers: stored.valueProfile?.answers ?? null })
        setConnections(stored.insurances ?? {})
        setView('profile')
      })
      .catch((error) => {
        console.warn('Could not load profile, starting onboarding:', error)
        if (!cancelled) setView('values')
      })
    return () => { cancelled = true }
  }, [])

  function persist(answers: Answers | null, insurances: ConnectionState) {
    setSaveError('')
    saveProfile(buildStoredProfile(answers, insurances))
      .catch((error: unknown) => setSaveError(error instanceof Error ? error.message : 'Kunne ikke lagre profilen.'))
  }

  // During first-time onboarding, step 1 continues to step 2. Edits from the profile page return to the profile.
  // The matches page can also send the user to step 1 and expects them back afterwards.
  const afterValues: View = valuesReturn ?? (onboarded ? 'profile' : 'insurers')

  function handleValuesDone(answers: Answers | null) {
    const nextAnswers = answers ?? profile.answers
    setProfile({ answers: nextAnswers })
    if (onboarded) persist(nextAnswers, connections)
    setValuesReturn(null)
    setView(afterValues)
  }

  function showMatches() {
    setSeenMatches(true)
    setView('matches')
  }

  function finishInsurers(next: ConnectionState) {
    setConnections(next)
    setOnboarded(true)
    persist(profile.answers, next)
    setView('profile')
  }

  async function reset() {
    try {
      await deleteProfile()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Kunne ikke slette profilen.')
      return
    }
    setOnboarded(false)
    setSeenMatches(false)
    setConnections({})
    setProfile({ answers: null })
    setView('values')
  }

  return (
    <Theme theme={prefersDark ? 'dark' : 'light'} hasBackground className="app-theme">
      {saveError && (
        <Alert variant="error" size="small" closeButton onClose={() => setSaveError('')} className="app-alert">{saveError}</Alert>
      )}
      {view === 'loading' && (
        <HStack justify="center" align="center" className="app-loading">
          <Loader size="xlarge" title="Henter profilen din…" />
        </HStack>
      )}
      {view === 'values' && (
        <ValueProfileFlow
          initialAnswers={profile.answers}
          doneLabel={onboarded ? 'Lagre' : 'Neste: hent forsikringer'}
          onDone={handleValuesDone}
          onSkip={() => handleValuesDone(null)}
        />
      )}
      {view === 'insurers' && (
        <Onboarding
          initialConnections={connections}
          onBack={onboarded ? undefined : () => setView('values')}
          onDone={finishInsurers}
          onSkip={() => finishInsurers(connections)}
        />
      )}
      {view === 'profile' && (
        <ProfilePage
          connections={connections}
          profile={profile}
          onAddInsurers={() => setView('insurers')}
          onEditProfile={() => setView('values')}
          onReset={() => void reset()}
          onContinue={seenMatches ? () => setView('chat') : showMatches}
          continueLabel={seenMatches ? 'Gå til Vern' : 'Se hvem som passer deg'}
          onShowMatches={seenMatches ? showMatches : undefined}
        />
      )}
      {view === 'matches' && (
        <MatchPage
          connections={connections}
          profile={profile}
          onBack={() => setView('profile')}
          onContinue={() => setView('chat')}
          onCreateProfile={() => { setValuesReturn('matches'); setView('values') }}
        />
      )}
      {view === 'chat' && <Chat />}
    </Theme>
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