import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { Theme } from '@navikt/ds-react'
import Onboarding from './onboarding/Onboarding.tsx'
import { usePrefersDark } from './useMediaQuery.ts'
import './App.css'

type Message = { role: 'user' | 'assistant'; content: string }

function App() {
  const [onboarded, setOnboarded] = useState(false)
  const prefersDark = usePrefersDark()
  return (
    <Theme theme={prefersDark ? 'dark' : 'light'} hasBackground className="app-theme">
      {onboarded
        ? <Chat />
        : <Onboarding onDone={() => setOnboarded(true)} onSkip={() => setOnboarded(true)} />}
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