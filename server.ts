import { AzureCliCredential } from '@azure/identity'
import { AzureChatOpenAICompletions } from '@langchain/openai'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
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
  const context = `Du har tilgang til følgende forsikringsdata. Observasjonene er et manuelt innhentet øyeblikksbilde, mens registry er API-søketreff som kan inneholde flere foretak og ikke automatisk er bekreftede selskapskoblinger. Oppgi kilde, periode og omfang når du bruker dataene. Skill markedstall fra selskapstall. Ikke finn på manglende data eller presenter øyeblikksbildet som oppdatert i sanntid.\n${JSON.stringify(data)}`
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

async function handle(request: IncomingMessage, response: ServerResponse, invoke: Chat, loadData: typeof getInsuranceData) {
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
    let body = ''
    for await (const chunk of request) {
      body += chunk
      if (body.length > 100_000) {
        send(response, 413, { error: 'Request is too large' })
        return
      }
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

export function createChatServer(invoke: Chat = chat, loadData: typeof getInsuranceData = getInsuranceData) {
  return createServer((request, response) => { void handle(request, response, invoke, loadData) })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.API_PORT || 3001)
  createChatServer().listen(port, '127.0.0.1', () => console.log(`Chat API listening on http://127.0.0.1:${port}`))
}