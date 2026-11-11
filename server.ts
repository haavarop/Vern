import { AzureCliCredential } from '@azure/identity'
import { AzureChatOpenAICompletions } from '@langchain/openai'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { getInsuranceData } from './insurance-data.ts'

type Message = { role: 'user' | 'assistant'; content: string }
type Chat = (messages: Message[]) => Promise<string>

const credential = new AzureCliCredential()
const model = new AzureChatOpenAICompletions({
  model: 'gpt-6-luna',
  azureOpenAIEndpoint: 'https://genai.gjensidige.io',
  azureOpenAIApiDeploymentName: 'gpt-6-luna',
  azureOpenAIApiVersion: '2024-10-21',
  azureADTokenProvider: async () => {
    const token = await credential.getToken('https://cognitiveservices.azure.com/.default')
    if (!token) throw new Error('Azure CLI did not return an access token')
    return token.token
  },
  modelKwargs: { reasoning_effort: 'medium' },
  maxCompletionTokens: 4000,
})

async function chat(messages: Message[]) {
  const data = await getInsuranceData()
  const context = `Du har tilgang til følgende forsikringsdata. Observasjonenes dataStatus viser om de er oppdatert fra kilden eller stammer fra et manuelt øyeblikksbilde. Registry er API-søketreff som kan inneholde flere foretak og ikke automatisk er bekreftede selskapskoblinger. Oppgi kilde, periode og omfang når du bruker dataene. Skill markedstall fra selskapstall. Ikke finn på manglende data eller presenter historiske tall som oppdatert i sanntid.\n${JSON.stringify(data)}`
  const response = await model.invoke([
    ['system', context],
    ...messages.map(({ role, content }): ['ai' | 'human', string] => [role === 'assistant' ? 'ai' : 'human', content]),
  ])
  return response.text
}

function send(response: ServerResponse, status: number, body: object) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}

const DEFAULT_PROFILE_PATH = resolve(import.meta.dirname, 'data', 'profile.json')

class TooLarge extends Error {}

async function readBody(request: IncomingMessage, limit = 100_000) {
  let body = ''
  for await (const chunk of request) {
    body += chunk
    if (body.length > limit) throw new TooLarge()
  }
  return body
}

/** Returns the stored profile, or {} when the customer is new (missing or empty file). */
async function loadProfile(path: string): Promise<object> {
  try {
    const text = (await readFile(path, 'utf8')).trim()
    if (!text) return {}
    const data: unknown = JSON.parse(text)
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

async function saveProfile(path: string, profile: object) {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp`
  await writeFile(tmp, `${JSON.stringify(profile, null, 2)}\n`)
  await rename(tmp, path)
}

async function handleProfile(request: IncomingMessage, response: ServerResponse, path: string) {
  try {
    if (request.method === 'GET') {
      send(response, 200, await loadProfile(path))
      return
    }
    if (request.method === 'DELETE') {
      await rm(path, { force: true })
      send(response, 200, {})
      return
    }
    if (request.method === 'PUT') {
      if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
        send(response, 415, { error: 'Expected application/json.' })
        return
      }
      const data: unknown = JSON.parse(await readBody(request, 1_000_000))
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        send(response, 400, { error: 'Profile must be a JSON object.' })
        return
      }
      await saveProfile(path, data)
      send(response, 200, data)
      return
    }
    send(response, 405, { error: 'Method not allowed' })
  } catch (error) {
    if (error instanceof SyntaxError) send(response, 400, { error: 'Invalid JSON request.' })
    else if (error instanceof TooLarge) send(response, 413, { error: 'Request is too large' })
    else {
      console.error('Profile storage failed:', error)
      send(response, 500, { error: 'Could not read or save the profile.' })
    }
  }
}

async function handle(request: IncomingMessage, response: ServerResponse, invoke: Chat, loadData: typeof getInsuranceData, profilePath: string) {
  if (request.url === '/api/profile') {
    await handleProfile(request, response, profilePath)
    return
  }
  if (request.method === 'GET' && request.url === '/api/insurance-data') {
    try {
      send(response, 200, await loadData())
    } catch (error) {
      console.error('Insurance data request failed:', error)
      send(response, 502, { error: 'Could not load insurance data.' })
    }
    return
  }
  if (request.method !== 'POST' || request.url !== '/api/chat') {
    send(response, 404, { error: 'Not found' })
    return
  }
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    send(response, 415, { error: 'Expected application/json.' })
    return
  }

  try {
    let body: string
    try {
      body = await readBody(request)
    } catch (error) {
      if (error instanceof TooLarge) {
        send(response, 413, { error: 'Request is too large' })
        return
      }
      throw error
    }
    const data: unknown = JSON.parse(body)
    if (!data || typeof data !== 'object' || !('messages' in data) || !Array.isArray(data.messages) ||
      data.messages.length === 0 || data.messages.length > 100 ||
      !data.messages.every((message: unknown) => message && typeof message === 'object' &&
        'role' in message && (message.role === 'user' || message.role === 'assistant') &&
        'content' in message && typeof message.content === 'string' && message.content.trim().length > 0) ||
      data.messages.at(-1).role !== 'user') {
      send(response, 400, { error: 'Please provide a valid conversation ending with a user message.' })
      return
    }
    const reply = await invoke(data.messages as Message[])
    send(response, 200, { reply })
  } catch (error) {
    if (error instanceof SyntaxError) {
      send(response, 400, { error: 'Invalid JSON request.' })
      return
    }
    console.error('Azure chat request failed:', error)
    send(response, 502, { error: 'Could not reach Azure OpenAI. Check your Azure CLI login and access, then try again.' })
  }
}

export function createChatServer(
  invoke: Chat = chat,
  loadData: typeof getInsuranceData = getInsuranceData,
  profilePath = process.env.PROFILE_PATH || DEFAULT_PROFILE_PATH,
) {
  return createServer((request, response) => { void handle(request, response, invoke, loadData, profilePath) })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.API_PORT || 3001)
  createChatServer().listen(port, '127.0.0.1', () => console.log(`Chat API listening on http://127.0.0.1:${port}`))
}